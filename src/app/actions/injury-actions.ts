"use server"

import { getAuthenticatedContext, STAFF_ROLES } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface InjuryUpdateDTO {
  id: string
  injuryId: string
  updateDate: string
  notes: string | null
  newExpectedReturnDate: string | null
  createdByName?: string | null
  createdAt: string
}

export interface PlayerInjuryDTO {
  id: string
  clubId: string
  playerId: string
  injuryDate: string
  injuryType: string
  notes: string | null
  expectedReturnDate: string | null
  status: "activa" | "recuperado"
  bodyView: "front" | "back" | null
  bodyRegion: string | null
  bodyStructure: string | null
  bodySide: "left" | "right" | "center" | "none" | null
  laterality: "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica" | null
  severity: "Leve" | "Moderada" | "Grave" | "Por determinar" | null
  estimatedMinDays: number | null
  estimatedMaxDays: number | null
  estimatedReturnFrom: string | null
  estimatedReturnTo: string | null
  actualReturnDate: string | null
  updates?: InjuryUpdateDTO[]
  createdAt: string
  updatedAt: string
}

export interface CreateInjuryInput {
  playerId: string
  injuryDate: string
  injuryType: string
  notes?: string
  expectedReturnDate?: string
  bodyView?: "front" | "back" | null
  bodyRegion?: string | null
  bodyStructure?: string | null
  laterality?: "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica" | null
  severity?: "Leve" | "Moderada" | "Grave" | "Por determinar" | null
  estimatedMinDays?: number | null
  estimatedMaxDays?: number | null
  estimatedReturnFrom?: string | null
  estimatedReturnTo?: string | null
}

/**
 * Obtiene el historial de lesiones de un jugador específico.
 * Estrictamente aislado por club_id derivado de la sesión del usuario.
 */
export async function getPlayerInjuriesAction(playerId: string): Promise<{
  success: boolean
  injuries?: PlayerInjuryDTO[]
  error?: string
}> {
  try {
    if (!playerId) {
      return { success: false, error: "ID de jugador no especificado" }
    }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: "No autenticado" }
    }

    const clubId = context.profile.club_id
    if (!clubId) {
      return { success: false, error: "Usuario sin club asignado" }
    }

    const supabase = createAdminClient()

    // 1. Validar que el jugador pertenezca estrictamente al mismo club
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("id, club_id")
      .eq("id", playerId)
      .single()

    if (playerErr || !player) {
      return { success: false, error: "Jugador no encontrado" }
    }

    if (player.club_id !== clubId) {
      return { success: false, error: "Acceso no autorizado: el jugador pertenece a otro club" }
    }

    // 2. Consultar lesiones del jugador en este club
    const { data: injuries, error: injErr } = await supabase
      .from("player_injuries")
      .select("*")
      .eq("player_id", playerId)
      .eq("club_id", clubId)
      .order("injury_date", { ascending: false })

    if (injErr) {
      return { success: false, error: injErr.message }
    }

    // 3. Consultar las evoluciones registradas para estas lesiones
    const injuryIds = (injuries || []).map((i) => i.id)
    let updatesMap: Record<string, InjuryUpdateDTO[]> = {}

    if (injuryIds.length > 0) {
      const { data: updates } = await supabase
        .from("player_injury_updates")
        .select(`
          id,
          injury_id,
          update_date,
          notes,
          new_expected_return_date,
          created_at,
          created_by,
          profiles:created_by (first_name, last_name)
        `)
        .in("injury_id", injuryIds)
        .order("created_at", { ascending: false })

      for (const u of updates || []) {
        const item: InjuryUpdateDTO = {
          id: u.id,
          injuryId: u.injury_id,
          updateDate: u.update_date,
          notes: u.notes,
          newExpectedReturnDate: u.new_expected_return_date,
          createdByName: (u as any).profiles
            ? `${(u as any).profiles.first_name || ""} ${(u as any).profiles.last_name || ""}`.trim()
            : null,
          createdAt: u.created_at,
        }
        if (!updatesMap[u.injury_id]) {
          updatesMap[u.injury_id] = []
        }
        updatesMap[u.injury_id].push(item)
      }
    }

    // Ordenar activas primero, y luego por fecha descendente
    const sorted = (injuries || []).sort((a, b) => {
      if (a.status === "activa" && b.status !== "activa") return -1
      if (a.status !== "activa" && b.status === "activa") return 1
      return new Date(b.injury_date).getTime() - new Date(a.injury_date).getTime()
    })

    const mapped: PlayerInjuryDTO[] = sorted.map((row) => ({
      id: row.id,
      clubId: row.club_id,
      playerId: row.player_id,
      injuryDate: row.injury_date,
      injuryType: row.injury_type,
      notes: row.notes,
      expectedReturnDate: row.expected_return_date,
      status: row.status,
      bodyView: row.body_view || null,
      bodyRegion: row.body_region || null,
      bodyStructure: row.body_structure || null,
      bodySide: row.body_side || null,
      laterality: row.laterality || "no_aplica",
      severity: row.severity || "Por determinar",
      estimatedMinDays: row.estimated_min_days || null,
      estimatedMaxDays: row.estimated_max_days || null,
      estimatedReturnFrom: row.estimated_return_from || null,
      estimatedReturnTo: row.estimated_return_to || null,
      actualReturnDate: row.actual_return_date || null,
      updates: updatesMap[row.id] || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return { success: true, injuries: mapped }
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado al obtener lesiones" }
  }
}

/**
 * Registra una nueva lesión para un jugador.
 * Exclusivamente para roles de STAFF del club.
 * NO modifica la tabla players ni altera players.status.
 */
export async function createInjuryAction(data: CreateInjuryInput): Promise<{
  success: boolean
  injury?: PlayerInjuryDTO
  error?: string
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: "No autenticado" }
    }

    // Validar rol de staff
    const userRole = context.profile.role
    const userRoles = context.profile.roles || [userRole]
    const hasStaffRole = userRoles.some((r) => STAFF_ROLES.includes(r))

    if (!hasStaffRole) {
      return { success: false, error: "No tienes permisos de cuerpo técnico/directiva para registrar lesiones" }
    }

    const clubId = context.profile.club_id
    if (!clubId) {
      return { success: false, error: "Usuario sin club asignado" }
    }

    // Validaciones de datos obligatorios
    if (!data.playerId) {
      return { success: false, error: "ID de jugador obligatorio" }
    }
    if (!data.injuryDate) {
      return { success: false, error: "Fecha de lesión obligatoria" }
    }
    if (!data.injuryType || data.injuryType.trim().length === 0) {
      return { success: false, error: "Tipo de lesión obligatorio" }
    }

    const supabase = createAdminClient()

    // Validar que el jugador pertenece al club del usuario autenticado
    const { data: player, error: pErr } = await supabase
      .from("players")
      .select("id, club_id")
      .eq("id", data.playerId)
      .single()

    if (pErr || !player) {
      return { success: false, error: "Jugador no encontrado" }
    }

    if (player.club_id !== clubId) {
      return { success: false, error: "Acceso no autorizado: el jugador pertenece a otro club" }
    }

    // Insertar exclusivamente en player_injuries
    const newInjuryPayload = {
      club_id: clubId,
      player_id: data.playerId,
      injury_date: data.injuryDate,
      injury_type: data.injuryType.trim(),
      notes: data.notes?.trim() || null,
      expected_return_date: data.expectedReturnDate || null,
      status: "activa",
      body_view: data.bodyView || null,
      body_region: data.bodyRegion || null,
      body_structure: data.bodyStructure || null,
      laterality: data.laterality || "no_aplica",
      severity: data.severity || "Por determinar",
      estimated_min_days: data.estimatedMinDays || null,
      estimated_max_days: data.estimatedMaxDays || null,
      estimated_return_from: data.estimatedReturnFrom || null,
      estimated_return_to: data.estimatedReturnTo || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("player_injuries")
      .insert([newInjuryPayload])
      .select("*")
      .single()

    if (insertErr || !inserted) {
      return { success: false, error: insertErr?.message || "Error al insertar lesión" }
    }

    const mapped: PlayerInjuryDTO = {
      id: inserted.id,
      clubId: inserted.club_id,
      playerId: inserted.player_id,
      injuryDate: inserted.injury_date,
      injuryType: inserted.injury_type,
      notes: inserted.notes,
      expectedReturnDate: inserted.expected_return_date,
      status: inserted.status,
      bodyView: inserted.body_view || null,
      bodyRegion: inserted.body_region || null,
      bodyStructure: inserted.body_structure || null,
      bodySide: inserted.body_side || null,
      laterality: inserted.laterality || "no_aplica",
      severity: inserted.severity || "Por determinar",
      estimatedMinDays: inserted.estimated_min_days || null,
      estimatedMaxDays: inserted.estimated_max_days || null,
      estimatedReturnFrom: inserted.estimated_return_from || null,
      estimatedReturnTo: inserted.estimated_return_to || null,
      actualReturnDate: inserted.actual_return_date || null,
      updates: [],
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    }

    try {
      revalidatePath(`/dashboard/club/jugador/${data.playerId}`)
    } catch {
      // Ignorar fuera de contexto de ruta
    }

    return { success: true, injury: mapped }
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado al registrar lesión" }
  }
}

/**
 * Registra una nota de evolución y opcionalmente actualiza la previsión de regreso.
 * Almacena el historial en player_injury_updates.
 */
export async function addInjuryUpdateAction(data: {
  injuryId: string
  notes: string
  newExpectedReturnDate?: string
}): Promise<{
  success: boolean
  update?: InjuryUpdateDTO
  error?: string
}> {
  try {
    if (!data.injuryId) {
      return { success: false, error: "ID de lesión obligatorio" }
    }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: "No autenticado" }
    }

    const userRole = context.profile.role
    const userRoles = context.profile.roles || [userRole]
    const hasStaffRole = userRoles.some((r) => STAFF_ROLES.includes(r))

    if (!hasStaffRole) {
      return { success: false, error: "No tienes permisos para registrar evoluciones" }
    }

    const clubId = context.profile.club_id
    if (!clubId) {
      return { success: false, error: "Usuario sin club asignado" }
    }

    const supabase = createAdminClient()

    // 1. Obtener la lesión y verificar pertenencia al club
    const { data: injury, error: injErr } = await supabase
      .from("player_injuries")
      .select("id, club_id, expected_return_date")
      .eq("id", data.injuryId)
      .single()

    if (injErr || !injury) {
      return { success: false, error: "Lesión no encontrada" }
    }

    if (injury.club_id !== clubId) {
      return { success: false, error: "Acceso no autorizado: la lesión pertenece a otro club" }
    }

    // 2. Insertar en player_injury_updates
    const updateRecord = {
      club_id: clubId,
      injury_id: data.injuryId,
      update_date: new Date().toISOString().split("T")[0],
      notes: data.notes?.trim() || null,
      new_expected_return_date: data.newExpectedReturnDate || null,
      created_by: context.user.id,
      created_at: new Date().toISOString(),
    }

    const { data: insertedUpdate, error: insertErr } = await supabase
      .from("player_injury_updates")
      .insert([updateRecord])
      .select("*")
      .single()

    if (insertErr || !insertedUpdate) {
      return { success: false, error: insertErr?.message || "Error al registrar evolución" }
    }

    // 3. Si se proporciona una nueva previsión, actualizar la lesión cabecera
    if (data.newExpectedReturnDate) {
      await supabase
        .from("player_injuries")
        .update({
          expected_return_date: data.newExpectedReturnDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.injuryId)
    }

    const mapped: InjuryUpdateDTO = {
      id: insertedUpdate.id,
      injuryId: insertedUpdate.injury_id,
      updateDate: insertedUpdate.update_date,
      notes: insertedUpdate.notes,
      newExpectedReturnDate: insertedUpdate.new_expected_return_date,
      createdByName: `${context.profile.first_name || ""} ${context.profile.last_name || ""}`.trim() || null,
      createdAt: insertedUpdate.created_at,
    }

    return { success: true, update: mapped }
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado al registrar evolución" }
  }
}

/**
 * Marca una lesión existente como 'recuperado'.
 * Exclusivamente para roles de STAFF del club.
 * NO modifica la tabla players ni altera players.status.
 */
export async function resolveInjuryAction(
  injuryId: string,
  actualReturnDate?: string,
  resolutionNotes?: string
): Promise<{
  success: boolean
  injury?: PlayerInjuryDTO
  error?: string
}> {
  try {
    if (!injuryId) {
      return { success: false, error: "ID de lesión obligatorio" }
    }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: "No autenticado" }
    }

    const userRole = context.profile.role
    const userRoles = context.profile.roles || [userRole]
    const hasStaffRole = userRoles.some((r) => STAFF_ROLES.includes(r))

    if (!hasStaffRole) {
      return { success: false, error: "No tienes permisos para modificar lesiones" }
    }

    const clubId = context.profile.club_id
    if (!clubId) {
      return { success: false, error: "Usuario sin club asignado" }
    }

    const supabase = createAdminClient()

    // 1. Obtener la lesión y verificar pertenencia estricta al club
    const { data: existing, error: existErr } = await supabase
      .from("player_injuries")
      .select("*")
      .eq("id", injuryId)
      .single()

    if (existErr || !existing) {
      return { success: false, error: "Lesión no encontrada" }
    }

    if (existing.club_id !== clubId) {
      return { success: false, error: "Acceso no autorizado: la lesión pertenece a otro club" }
    }

    // 2. Actualizar exclusivamente la fila de la lesión a 'recuperado'
    const returnDateVal = actualReturnDate || new Date().toISOString().split("T")[0]
    const updatePayload: any = {
      status: "recuperado",
      actual_return_date: returnDateVal,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateErr } = await supabase
      .from("player_injuries")
      .update(updatePayload)
      .eq("id", injuryId)
      .eq("club_id", clubId)
      .select("*")
      .single()

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || "Error al actualizar lesión" }
    }

    // 3. Si hay nota de resolución, registrarla en player_injury_updates
    if (resolutionNotes?.trim()) {
      await supabase.from("player_injury_updates").insert([
        {
          club_id: clubId,
          injury_id: injuryId,
          update_date: returnDateVal,
          notes: `[ALTA DEPORTIVA] ${resolutionNotes.trim()}`,
          created_by: context.user.id,
          created_at: new Date().toISOString(),
        },
      ])
    }

    const mapped: PlayerInjuryDTO = {
      id: updated.id,
      clubId: updated.club_id,
      playerId: updated.player_id,
      injuryDate: updated.injury_date,
      injuryType: updated.injury_type,
      notes: updated.notes,
      expectedReturnDate: updated.expected_return_date,
      status: updated.status,
      bodyView: updated.body_view || null,
      bodyRegion: updated.body_region || null,
      bodyStructure: updated.body_structure || null,
      bodySide: updated.body_side || null,
      laterality: updated.laterality || "no_aplica",
      severity: updated.severity || "Por determinar",
      estimatedMinDays: updated.estimated_min_days || null,
      estimatedMaxDays: updated.estimated_max_days || null,
      estimatedReturnFrom: updated.estimated_return_from || null,
      estimatedReturnTo: updated.estimated_return_to || null,
      actualReturnDate: updated.actual_return_date || null,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }

    try {
      revalidatePath(`/dashboard/club/jugador/${updated.player_id}`)
    } catch {
      // Ignorar fuera de contexto de ruta
    }

    return { success: true, injury: mapped }
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado al resolver lesión" }
  }
}

export interface RegisterClinicalEpisodeInput {
  playerId: string
  injuryDate: string
  injuryTypeCode?: string
  injuryTypeName: string
  anatomicalZoneCode?: string
  bodyRegion?: string
  bodyStructure?: string
  laterality?: "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica"
  bodyView?: "front" | "back"
  severity?: "Leve" | "Moderada" | "Grave" | "Por determinar"
  isRecurrence?: boolean
  parentInjuryId?: string | null
  mechanismDetails?: string
  diagnosisNotes?: string
  expectedReturnDate?: string
  estimatedMinDays?: number | null
  estimatedMaxDays?: number | null
  estimatedReturnFrom?: string | null
  estimatedReturnTo?: string | null
  // Evaluación clínica inicial
  examinerName?: string
  painAtRest?: number
  painOnPalpation?: number
  painOnContraction?: number
  painOnStretch?: number
  functionalStatus?: string
  clinicalFindings?: string
  // Pruebas complementarias iniciales
  medicalTestType?: string
  medicalTestSummary?: string
  medicalTestFindings?: string
  medicalTestFileUrl?: string
}

/**
 * FASE 4: Registro Clínico Integral de Nuevo Episodio Lesional.
 * Crea el episodio maestro en player_injuries, vincula catálogos de Fase 2,
 * asienta el estado inicial en injury_status_history y registra la valoración
 * clínica inicial en injury_examinations y injury_pain_records.
 */
export async function registerClinicalInjuryEpisodeAction(
  input: RegisterClinicalEpisodeInput
): Promise<{
  success: boolean
  injury?: PlayerInjuryDTO
  error?: string
}> {
  try {
    if (!input.playerId || !input.injuryDate || !input.injuryTypeName) {
      return { success: false, error: "Datos clínicos obligatorios incompletos (jugador, fecha o diagnóstico)." }
    }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: "No autenticado" }
    }

    const clubId = context.profile.club_id
    if (!clubId) {
      return { success: false, error: "Usuario sin club asignado" }
    }

    const role = context.profile.role
    if (!STAFF_ROLES.includes(role)) {
      return { success: false, error: "Permisos insuficientes para registrar episodios médicos." }
    }

    const admin = createAdminClient()

    // 1. Resolver anatomical_zone_id si se especificó un código
    let anatomicalZoneId: string | null = null
    if (input.anatomicalZoneCode) {
      const { data: zoneRow } = await admin
        .from("anatomical_zones")
        .select("id")
        .eq("code", input.anatomicalZoneCode)
        .maybeSingle()
      if (zoneRow) anatomicalZoneId = zoneRow.id
    }

    // 2. Resolver injury_type_id si se especificó un código
    let injuryTypeId: string | null = null
    if (input.injuryTypeCode) {
      const { data: typeRow } = await admin
        .from("injury_types")
        .select("id")
        .eq("code", input.injuryTypeCode)
        .maybeSingle()
      if (typeRow) injuryTypeId = typeRow.id
    }

    // 3. Insertar episodio maestro en player_injuries
    const { data: newInjury, error: insertErr } = await admin
      .from("player_injuries")
      .insert([
        {
          club_id: clubId,
          player_id: input.playerId,
          injury_date: input.injuryDate,
          injury_type: input.injuryTypeName, // compatibilidad legacy
          injury_type_id: injuryTypeId,
          anatomical_zone_id: anatomicalZoneId,
          parent_injury_id: input.parentInjuryId || null,
          is_recurrence: Boolean(input.isRecurrence),
          rts_phase: "fase_1_aguda",
          mechanism_details: input.mechanismDetails || null,
          diagnosis_notes: input.diagnosisNotes || null,
          notes: input.diagnosisNotes || null,
          expected_return_date: input.expectedReturnDate || null,
          status: "activa",
          body_view: input.bodyView || "back",
          body_region: input.bodyRegion || "Miembros inferiores",
          body_structure: input.bodyStructure || input.injuryTypeName,
          laterality: input.laterality || "derecha",
          severity: input.severity || "Moderada",
          estimated_min_days: input.estimatedMinDays || null,
          estimated_max_days: input.estimatedMaxDays || null,
          estimated_return_from: input.estimatedReturnFrom || null,
          estimated_return_to: input.estimatedReturnTo || null,
        },
      ])
      .select()
      .single()

    if (insertErr || !newInjury) {
      console.error("[registerClinicalInjuryEpisodeAction] Error en player_injuries:", insertErr)
      return { success: false, error: insertErr?.message || "No se pudo registrar la lesión." }
    }

    // 4. Registrar transición inicial en injury_status_history
    await admin.from("injury_status_history").insert([
      {
        club_id: clubId,
        injury_id: newInjury.id,
        from_status: null,
        to_status: "activa",
        changed_by: context.profile.id,
        reason: "Alta de nuevo episodio lesional y valoración clínica inicial",
      },
    ])

    // 5. Registrar evaluación clínica inicial en injury_examinations si se aportaron datos
    const examiner = input.examinerName || `${context.profile.first_name || ""} ${context.profile.last_name || ""}`.trim() || "Fisioterapeuta / Médico"
    const hasClinicalExam =
      input.painAtRest !== undefined ||
      input.painOnPalpation !== undefined ||
      input.functionalStatus ||
      input.clinicalFindings

    if (hasClinicalExam) {
      await admin.from("injury_examinations").insert([
        {
          club_id: clubId,
          injury_id: newInjury.id,
          player_id: input.playerId,
          examination_date: input.injuryDate,
          examiner_id: context.profile.id,
          examiner_name: examiner,
          pain_at_rest: input.painAtRest ?? 2,
          pain_on_palpation: input.painOnPalpation ?? 6,
          pain_on_contraction: input.painOnContraction ?? 7,
          pain_on_stretch: input.painOnStretch ?? 6,
          functional_status: input.functionalStatus || "Limitación funcional moderada en flexo-extensión",
          clinical_findings: input.clinicalFindings || "Dolor selectivo a la palpación e impotencia funcional en gestos excéntricos.",
          notes: input.diagnosisNotes || null,
        },
      ])

      // Registrar dolor en escala EVA inicial (0-10) en injury_pain_records
      const maxPain = Math.max(input.painAtRest ?? 0, input.painOnPalpation ?? 0, input.painOnContraction ?? 5)
      await admin.from("injury_pain_records").insert([
        {
          club_id: clubId,
          injury_id: newInjury.id,
          player_id: input.playerId,
          record_date: input.injuryDate,
          pain_score: maxPain,
          context: "valoracion_inicial",
          notes: "Evaluación del dolor en el momento del diagnóstico",
        },
      ])
    }

    // 6. Registrar prueba médica complementaria si se adjuntó
    if (input.medicalTestType && input.medicalTestSummary) {
      await admin.from("injury_medical_tests").insert([
        {
          club_id: clubId,
          injury_id: newInjury.id,
          test_type: input.medicalTestType,
          test_date: input.injuryDate,
          facility_or_doctor: examiner,
          report_summary: input.medicalTestSummary,
          key_findings: input.medicalTestFindings || null,
          image_or_file_url: input.medicalTestFileUrl || null,
        },
      ])
    }

    const mapped: PlayerInjuryDTO = {
      id: newInjury.id,
      clubId: newInjury.club_id,
      playerId: newInjury.player_id,
      injuryDate: newInjury.injury_date,
      injuryType: newInjury.injury_type,
      notes: newInjury.notes,
      expectedReturnDate: newInjury.expected_return_date,
      status: newInjury.status,
      bodyView: newInjury.body_view,
      bodyRegion: newInjury.body_region,
      bodyStructure: newInjury.body_structure,
      bodySide: newInjury.body_side,
      laterality: newInjury.laterality,
      severity: newInjury.severity,
      estimatedMinDays: newInjury.estimated_min_days,
      estimatedMaxDays: newInjury.estimated_max_days,
      estimatedReturnFrom: newInjury.estimated_return_from,
      estimatedReturnTo: newInjury.estimated_return_to,
      actualReturnDate: newInjury.actual_return_date,
      createdAt: newInjury.created_at,
      updatedAt: newInjury.updated_at,
    }

    try {
      revalidatePath(`/dashboard/club/jugador/${newInjury.player_id}`)
      revalidatePath(`/dashboard/players/${newInjury.player_id}/fisico-lesiones`)
    } catch {
      // Ignorar fuera de ruta
    }

    return { success: true, injury: mapped }
  } catch (err: any) {
    console.error("[registerClinicalInjuryEpisodeAction] Error fatal:", err)
    return { success: false, error: err.message || "Error inesperado al registrar el episodio clínico." }
  }
}
