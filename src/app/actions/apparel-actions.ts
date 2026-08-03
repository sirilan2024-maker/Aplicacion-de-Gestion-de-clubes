'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const DEFAULT_ITEMS = [
  'Camiseta de Juego',
  'Pantalón de Juego',
  'Medias',
  'Chándal Oficial',
  'Camiseta de Entrenamiento (1/2)',
  'Camiseta de Entrenamiento (2/2)',
  'Pantalón de Entrenamiento (1/2)',
  'Pantalón de Entrenamiento (2/2)',
  'Sudadera',
  'Pantalón de paseo',
  'Camiseta de paseo',
  'Mochila'
]

// 1. Recuperar tallas y estado de entrega de un jugador
export async function getApparelForPlayerAction(playerId: string) {
  const supabase = await createClient()

  try {
    const { data: apparelData, error } = await supabase
      .from('player_apparel')
      .select('*')
      .eq('player_id', playerId)

    if (error) throw error

    // Formatear los datos como un mapa para facil acceso en UI
    const apparelMap: { [itemName: string]: { size: string, delivered: boolean, delivered_at: string | null } } = {}
    
    // Inicializar todos los artículos con valores vacíos por defecto
    DEFAULT_ITEMS.forEach(item => {
      apparelMap[item] = { size: '', delivered: false, delivered_at: null }
    })

    // Rellenar con los datos guardados en la BD
    apparelData?.forEach(row => {
      if (DEFAULT_ITEMS.includes(row.item_name)) {
        apparelMap[row.item_name] = {
          size: row.size,
          delivered: row.delivered,
          delivered_at: row.delivered_at
        }
      }
    })

    // Fetch player dorsal
    const { data: playerData } = await supabase
      .from('players')
      .select('dorsal')
      .eq('id', playerId)
      .maybeSingle()

    return { success: true, data: apparelMap, dorsal: playerData?.dorsal || '' }
  } catch (error: any) {
    console.error('Error in getApparelForPlayerAction:', error.message)
    return { success: false, error: error.message }
  }
}

// 2. Guardar o actualizar las tallas de un jugador (Tutor/Jugador)
export async function updatePlayerApparelSizesAction(playerId: string, sizes: { [itemName: string]: string }, dorsal?: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // Update player dorsal if provided
    if (dorsal !== undefined) {
      const { error: dorsalError } = await supabase
        .from('players')
        .update({ dorsal: dorsal })
        .eq('id', playerId)
      if (dorsalError) throw dorsalError
    }

    // Fetch user profile role to bypass delivered check for staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStaff = profile?.role === 'admin' || profile?.role === 'coordinador' || profile?.role === 'utillero';

    // 1. Verificar si el artículo ya está entregado en la BD
    const { data: existingApparel } = await supabase
      .from('player_apparel')
      .select('item_name, delivered')
      .eq('player_id', playerId)

    const deliveredItems = new Set(
      existingApparel?.filter(row => row.delivered).map(row => row.item_name) || []
    )

    // Si se pasa una talla vacía (para borrar), eliminamos el registro en la BD
    const toDelete = Object.entries(sizes)
      .filter(([itemName, size]) => DEFAULT_ITEMS.includes(itemName) && size === '')
      .map(([itemName]) => itemName)

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('player_apparel')
        .delete()
        .eq('player_id', playerId)
        .in('item_name', toDelete)
      if (delError) throw delError
    }

    // 2. Preparar los registros para upsertar, omitiendo los que ya fueron entregados (salvo que sea staff)
    const upserts = Object.entries(sizes)
      .filter(([itemName, size]) => {
        const isOfficial = DEFAULT_ITEMS.includes(itemName)
        const isDelivered = deliveredItems.has(itemName)
        return isOfficial && size !== '' && (isStaff || !isDelivered)
      })
      .map(([itemName, size]) => ({
        player_id: playerId,
        item_name: itemName,
        size: size,
        updated_at: new Date().toISOString()
      }))

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('player_apparel')
        .upsert(upserts, { onConflict: 'player_id,item_name' })
      if (error) throw error
    } else if (Object.keys(sizes).length > 0) {
      return { success: false, error: `Las prendas seleccionadas no coinciden con la lista oficial del servidor: ${Object.keys(sizes).join(', ')}` }
    }

    revalidatePath(`/dashboard/family/e/${playerId}/ropa`)
    revalidatePath('/dashboard/utilleria')
    return { success: true }
  } catch (error: any) {
    console.error('Error in updatePlayerApparelSizesAction:', error.message)
    return { success: false, error: error.message }
  }
}

// 3. Cambiar estado de entrega (marca/desmarca) - Reservado para staff
export async function toggleApparelDeliveryAction(playerId: string, itemName: string, delivered: boolean) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // Verificar rol de staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const hasPermission = profile?.role === 'admin' || profile?.role === 'coordinador' || profile?.role === 'utillero'
    if (!hasPermission) {
      return { success: false, error: 'No tienes permisos de utillaje para esta acción.' }
    }

    // Buscar si el registro ya existe
    const { data: existing } = await supabase
      .from('player_apparel')
      .select('id, size')
      .eq('player_id', playerId)
      .eq('item_name', itemName)
      .maybeSingle()

    if (!existing) {
      if (['Medias', 'Mochila'].includes(itemName)) {
        const { error: insertError } = await supabase
          .from('player_apparel')
          .insert({
            player_id: playerId,
            item_name: itemName,
            size: 'Única',
            delivered: delivered,
            delivered_at: delivered ? new Date().toISOString() : null
          })
        if (insertError) throw insertError
      } else {
        return { success: false, error: 'El jugador debe tener asignada una talla antes de marcarse como entregado.' }
      }
    } else {
      const { error } = await supabase
        .from('player_apparel')
        .update({
          delivered: delivered,
          delivered_at: delivered ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    }

    revalidatePath('/dashboard/utilleria')
    revalidatePath(`/dashboard/family/e/${playerId}/ropa`)
    revalidatePath(`/dashboard/family/e/${playerId}/ficha`)
    revalidatePath(`/dashboard/club/jugador/${playerId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in toggleApparelDeliveryAction:', error.message)
    return { success: false, error: error.message }
  }
}

// 4. Obtener todos los datos de ropa de los jugadores (para el panel del utillero)
export async function getApparelDashboardDataAction(teamId?: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // RLS se encargará de limitar el acceso, pero hacemos verificación adicional
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const hasPermission = profile?.role === 'admin' || profile?.role === 'coordinador' || profile?.role === 'utillero'
    if (!hasPermission) {
      return { success: false, error: 'Acceso denegado.' }
    }

    // Consultar jugadores activos
    let query = supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        status,
        dorsal,
        team_id,
        teams (
          id,
          name,
          category
        ),
        player_apparel (
          item_name,
          size,
          delivered,
          delivered_at
        )
      `)
      .neq('status', 'inactive')

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data: playersData, error } = await query
    if (error) throw error

    // Formatear jugadores con su mapa de ropa
    const formattedPlayers = playersData?.map((p: any) => {
      const apparelMap: { [itemName: string]: { size: string, delivered: boolean, delivered_at: string | null } } = {}
      
      // Inicializar todo vacío
      DEFAULT_ITEMS.forEach(item => {
        apparelMap[item] = { size: '', delivered: false, delivered_at: null }
      })

      // Cargar datos
      p.player_apparel?.forEach((row: any) => {
        if (DEFAULT_ITEMS.includes(row.item_name)) {
          let rowSize = row.size;
          // Fix for legacy sizes that lack the "Talla " prefix
          if (/^(116|128|140|152|164|176)$/.test(rowSize)) {
            rowSize = `Talla ${rowSize}`;
          }
          
          apparelMap[row.item_name] = {
            size: rowSize,
            delivered: row.delivered,
            delivered_at: row.delivered_at
          }
        }
      })

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        dorsal: p.dorsal || '',
        team_name: p.teams?.name || 'Sin equipo',
        category: p.teams?.category || 'Sin categoría',
        apparel: apparelMap
      }
    })

    return { success: true, data: formattedPlayers }
  } catch (error: any) {
    console.error('Error in getApparelDashboardDataAction:', error.message)
    return { success: false, error: error.message }
  }
}

// 5. Obtener informe consolidado de pedidos (cantidades totales por artículo y talla)
export async function getApparelSummaryReportAction(teamId?: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // Consultar todos los registros de ropa de jugadores activos
    let allApparelRows: any[] = []
    let hasMore = true
    let page = 0
    const pageSize = 1000

    while (hasMore) {
      let query = supabase
        .from('player_apparel')
        .select(`
          item_name,
          size,
          delivered,
          players!inner (
            status,
            team_id
          )
        `)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (teamId) {
        query = query.eq('players.team_id', teamId)
      }

      const { data: apparelRows, error } = await query
      if (error) throw error

      if (apparelRows && apparelRows.length > 0) {
        allApparelRows = [...allApparelRows, ...apparelRows]
        if (apparelRows.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    const activeRows = allApparelRows.filter((row: any) => row.players?.status !== 'inactive')

    // Consolidar contadores en JS
    // Estructura: { [itemName]: { [size]: { totalNeeded: number, delivered: number, pending: number } } }
    const report: { 
      [itemName: string]: { 
        [size: string]: { totalNeeded: number, delivered: number, pending: number, initialStock?: number } 
      } 
    } = {}

    const CLOTHING_SIZES = ['Talla 116', 'Talla 128', 'Talla 140', 'Talla 152', 'Talla 164', 'Talla 176', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const SOCKS_SIZES = ['28-32', '33-35', '36-38', '39-42', '43-46'];

    // Obtener cantidad de jugadores activos para prendas de talla única (Medias, Mochila)
    let playersCountQuery = supabase.from('players').select('id', { count: 'exact', head: true }).neq('status', 'inactive')
    if (teamId) {
      playersCountQuery = playersCountQuery.eq('team_id', teamId)
    }
    const { count: totalActivePlayers } = await playersCountQuery
    const totalPlayers = totalActivePlayers || 0;

    // Inicializar prendas oficiales con TODAS sus tallas
    DEFAULT_ITEMS.forEach(item => {
      report[item] = {}
      
      let sizesToUse = CLOTHING_SIZES;
      if (item === 'Medias') sizesToUse = SOCKS_SIZES;
      else if (item === 'Mochila') sizesToUse = ['Única'];

      sizesToUse.forEach(size => {
        const isUnica = sizesToUse.length === 1 && size === 'Única';
        report[item][size] = { 
          totalNeeded: isUnica ? totalPlayers : 0, 
          delivered: 0, 
          pending: 0, 
          initialStock: 0 
        }
      })
    })

    activeRows?.forEach((row: any) => {
      const item = row.item_name
      let size = row.size || 'Única'
      
      // Fix for legacy sizes that lack the "Talla " prefix
      if (/^(116|128|140|152|164|176)$/.test(size)) {
        size = `Talla ${size}`;
      }

      // Asegurarnos de que Mochila cae en Única si venía con otra cosa por error histórico
      if (item === 'Mochila') {
        size = 'Única'
      }

      const isDelivered = row.delivered

      if (!report[item]) report[item] = {}
      if (!report[item][size]) {
        report[item][size] = { totalNeeded: 0, delivered: 0, pending: 0, initialStock: 0 }
      }

      // Solo incrementamos totalNeeded si NO es una prenda de talla única (ya lo sumamos arriba por cantidad de jugadores)
      if (item !== 'Mochila') {
        report[item][size].totalNeeded += 1
      }
      
      if (isDelivered) {
        report[item][size].delivered += 1
      } else {
        report[item][size].pending += 1
      }
    })

    // Fetch initial stock
    const { data: stockData } = await supabase.from('apparel_stock').select('*')
    stockData?.forEach(row => {
      const item = row.item_name
      let size = row.size || 'Única'
      
      // Fix for legacy sizes that lack the "Talla " prefix
      if (/^(116|128|140|152|164|176)$/.test(size)) {
        size = `Talla ${size}`;
      }

      if (item === 'Mochila') {
        size = 'Única'
      }

      if (!report[item]) report[item] = {}
      if (!report[item][size]) {
        report[item][size] = { totalNeeded: 0, delivered: 0, pending: 0, initialStock: 0 }
      }
      // Sumar al stock inicial por si hubiera registros legacy duplicados (ej: 116 y Talla 116)
      report[item][size].initialStock = (report[item][size].initialStock || 0) + (row.stock || 0)
    })

    return { success: true, data: report }
  } catch (error: any) {
    console.error('Error in getApparelSummaryReportAction:', error.message)
    return { success: false, error: error.message }
  }
}

export async function updateApparelStockAction(itemName: string, size: string, stock: number) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('apparel_stock')
      .upsert({ item_name: itemName, size: size, stock: stock, updated_at: new Date().toISOString() }, { onConflict: 'item_name,size' })
    if (error) throw error
    revalidatePath('/dashboard/utilleria')
    return { success: true }
  } catch (error: any) {
    console.error('Error in updateApparelStockAction:', error.message)
    return { success: false, error: error.message }
  }
}
