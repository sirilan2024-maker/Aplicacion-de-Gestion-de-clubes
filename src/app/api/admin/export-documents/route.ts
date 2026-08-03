import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
// We use JSZip on the server side – it's already installed
import JSZip from 'jszip'

// Helper to sanitize folder/file names
function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Sin_nombre'
}

// Extension guesser from content-type or file_url
function getExtension(fileUrl: string, contentType?: string): string {
  if (contentType) {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'image/tiff': '.tiff',
    }
    if (map[contentType]) return map[contentType]
  }
  // fallback: extract from url
  const parts = fileUrl.split('.')
  const ext = parts[parts.length - 1].split('?')[0]
  return ext ? `.${ext}` : ''
}

export async function GET(req: NextRequest) {
  try {
    // 1. Auth check – only admins can export
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'coordinador')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const clubId = profile.club_id
    if (!clubId) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 400 })
    }

    // 2. Optional filter: team_id from query params
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('team_id') // null = all teams

    const adminClient = createAdminClient()

    // 3. Get players
    let playersQuery = adminClient
      .from('players')
      .select('id, first_name, last_name, team_id, teams(id, name)')
      .eq('club_id', clubId)
      .neq('status', 'inactive')

    if (teamId && teamId !== 'all') {
      playersQuery = playersQuery.eq('team_id', teamId)
    }

    const { data: players, error: playersError } = await playersQuery
    if (playersError) throw playersError
    if (!players || players.length === 0) {
      return NextResponse.json({ error: 'No se encontraron jugadores' }, { status: 404 })
    }

    // 4. Get all documents for these players
    const playerIds = players.map(p => p.id)
    const { data: allDocs, error: docsError } = await adminClient
      .from('player_documents')
      .select('id, player_id, document_type, file_url, status')
      .in('player_id', playerIds)
      .not('file_url', 'is', null)

    if (docsError) throw docsError

    // 5. Group docs by player
    const docsByPlayer: Record<string, typeof allDocs> = {}
    ;(allDocs || []).forEach(doc => {
      if (!docsByPlayer[doc.player_id]) docsByPlayer[doc.player_id] = []
      docsByPlayer[doc.player_id].push(doc)
    })

    // 6. Build ZIP structure
    const zip = new JSZip()

    for (const player of players) {
      const teamObj = Array.isArray(player.teams) ? player.teams[0] : player.teams
      const teamName = sanitize((teamObj as any)?.name || 'Sin_equipo')
      const playerName = sanitize(`${player.first_name} ${player.last_name}`)

      const docs = docsByPlayer[player.id] || []
      if (docs.length === 0) continue

      // Track filenames used in this player folder to avoid collisions
      const usedNames: Record<string, number> = {}

      for (const doc of docs) {
        if (!doc.file_url) continue

        // Generate a signed URL (5 min is enough for download)
        const { data: signedData } = await adminClient.storage
          .from('expedientes-doc')
          .createSignedUrl(doc.file_url, 300)

        if (!signedData?.signedUrl) continue

        // Download the file
        let fileBuffer: ArrayBuffer
        try {
          const res = await fetch(signedData.signedUrl)
          if (!res.ok) continue
          const contentType = res.headers.get('content-type') || ''
          fileBuffer = await res.arrayBuffer()
          const ext = getExtension(doc.file_url, contentType)
          const baseName = doc.document_type || 'documento'
          let fileName = `${baseName}${ext}`

          // Avoid duplicate names in same folder
          if (usedNames[fileName] !== undefined) {
            usedNames[fileName]++
            fileName = `${baseName}_${usedNames[fileName]}${ext}`
          } else {
            usedNames[fileName] = 0
          }

          // Add to ZIP: TeamName/PlayerName/filename
          zip.folder(teamName)?.folder(playerName)?.file(fileName, fileBuffer)
        } catch {
          // Skip files that fail to download
          continue
        }
      }
    }

    // 7. Generate ZIP as Uint8Array (BodyInit compatible)
    const zipUint8 = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const scope = teamId && teamId !== 'all' ? 'equipo' : 'club'
    const fileName = `Expedientes_${scope}_${dateStr}.zip`

    return new NextResponse(zipUint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(zipUint8.byteLength),
      },
    })
  } catch (err: any) {
    console.error('[export-documents]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
