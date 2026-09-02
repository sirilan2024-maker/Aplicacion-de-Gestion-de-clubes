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
  rtsPhase?: string | null
  rts_phase?: string | null
  subzonePortion?: string | null
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
      subzonePortion: row.subzone_portion || null,
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
  subzonePortion?: string
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
          subzone_portion: input.subzonePortion || null,
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
      subzonePortion: newInjury.subzone_portion,
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

// ==============================================================================
// FASE 5: DTOs Y SERVER ACTIONS PARA SEGUIMIENTO CLÍNICO LONGITUDINAL
// ==============================================================================

export interface InjuryExaminationDTO {
  id: string
  clubId: string
  injuryId: string
  playerId: string
  examinationDate: string
  examinerName: string | null
  painAtRest: number | null
  painOnPalpation: number | null
  painOnContraction: number | null
  painOnStretch: number | null
  functionalStatus: string | null
  clinicalFindings: string | null
  notes: string | null
  createdAt: string
}

export interface InjuryPainRecordDTO {
  id: string
  injuryId: string
  recordDate: string
  painScore: number
  context: string | null
  notes: string | null
  createdAt: string
}

export interface InjuryFunctionalAssessmentDTO {
  id: string
  injuryId: string
  assessmentDate: string
  assessmentType: "rom" | "fuerza" | "estabilidad"
  structureOrJoint: string
  laterality: string | null
  testName: string
  metricValue: number | null
  metricUnit: string | null
  symmetryPercentage: number | null
  resultInterpretation: string | null
  notes: string | null
  createdAt: string
}

export interface InjuryMedicalTestDTO {
  id: string
  injuryId: string
  testType: string
  testDate: string
  facilityOrDoctor: string | null
  reportSummary: string
  keyFindings: string | null
  imageOrFileUrl: string | null
  createdAt: string
}

export interface InjuryTreatmentDTO {
  id: string
  injuryId: string
  treatmentName: string
  treatmentCategory: string
  startDate: string
  endDate: string | null
  professionalName: string | null
  responseToTreatment: string | null
  status: string
  notes: string | null
  createdAt: string
}

export interface InjuryStatusHistoryDTO {
  id: string
  injuryId: string
  fromStatus: string | null
  toStatus: string
  transitionDate: string
  changedByName?: string | null
  reason: string | null
}

export interface EpisodeClinicalDetailsDTO {
  injury: PlayerInjuryDTO
  examinations: InjuryExaminationDTO[]
  painRecords: InjuryPainRecordDTO[]
  functionalAssessments: InjuryFunctionalAssessmentDTO[]
  medicalTests: InjuryMedicalTestDTO[]
  treatments: InjuryTreatmentDTO[]
  statusHistory: InjuryStatusHistoryDTO[]
}

/**
 * Obtiene el expediente longitudinal completo de un episodio lesional específico.
 */
export async function getInjuryEpisodeDetailsAction(injuryId: string): Promise<{
  success: boolean
  details?: EpisodeClinicalDetailsDTO
  error?: string
}> {
  try {
    if (!injuryId) return { success: false, error: "ID de lesión no especificado." }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    // 1. Obtener lesión maestra
    const { data: inj, error: injErr } = await admin
      .from("player_injuries")
      .select("*")
      .eq("id", injuryId)
      .eq("club_id", clubId)
      .single()

    if (injErr || !inj) return { success: false, error: "Episodio no encontrado o no pertenece a este club." }

    // 2. Obtener revisiones clínicas
    const { data: exams } = await admin
      .from("injury_examinations")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("examination_date", { ascending: false })

    // 3. Obtener registros de dolor EVA
    const { data: pain } = await admin
      .from("injury_pain_records")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("record_date", { ascending: true })

    // 4. Obtener valoraciones funcionales (ROM y fuerza)
    const { data: assessments } = await admin
      .from("injury_functional_assessments")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("assessment_date", { ascending: false })

    // 5. Obtener pruebas médicas e imagen
    const { data: tests } = await admin
      .from("injury_medical_tests")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("test_date", { ascending: false })

    // 6. Obtener tratamientos
    const { data: treats } = await admin
      .from("injury_treatments")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("start_date", { ascending: false })

    // 7. Obtener historial de estados
    const { data: history } = await admin
      .from("injury_status_history")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("transition_date", { ascending: false })

    const mappedInjury: PlayerInjuryDTO = {
      id: inj.id,
      clubId: inj.club_id,
      playerId: inj.player_id,
      injuryDate: inj.injury_date,
      injuryType: inj.injury_type,
      notes: inj.notes,
      expectedReturnDate: inj.expected_return_date,
      status: inj.status,
      bodyView: inj.body_view,
      bodyRegion: inj.body_region,
      bodyStructure: inj.body_structure,
      bodySide: inj.body_side,
      laterality: inj.laterality,
      severity: inj.severity,
      estimatedMinDays: inj.estimated_min_days,
      estimatedMaxDays: inj.estimated_max_days,
      estimatedReturnFrom: inj.estimated_return_from,
      estimatedReturnTo: inj.estimated_return_to,
      actualReturnDate: inj.actual_return_date,
      subzonePortion: inj.subzone_portion,
      createdAt: inj.created_at,
      updatedAt: inj.updated_at,
    }

    const mappedExams: InjuryExaminationDTO[] = (exams || []).map((e: any) => ({
      id: e.id,
      clubId: e.club_id,
      injuryId: e.injury_id,
      playerId: e.player_id,
      examinationDate: e.examination_date,
      examinerName: e.examiner_name,
      painAtRest: e.pain_at_rest,
      painOnPalpation: e.pain_on_palpation,
      painOnContraction: e.pain_on_contraction,
      painOnStretch: e.pain_on_stretch,
      functionalStatus: e.functional_status,
      clinicalFindings: e.clinical_findings,
      notes: e.notes,
      createdAt: e.created_at,
    }))

    const mappedPain: InjuryPainRecordDTO[] = (pain || []).map((p: any) => ({
      id: p.id,
      injuryId: p.injury_id,
      recordDate: p.record_date,
      painScore: Number(p.pain_score),
      context: p.context,
      notes: p.notes,
      createdAt: p.created_at,
    }))

    const mappedAssessments: InjuryFunctionalAssessmentDTO[] = (assessments || []).map((a: any) => ({
      id: a.id,
      injuryId: a.injury_id,
      assessmentDate: a.assessment_date,
      assessmentType: a.assessment_type,
      structureOrJoint: a.structure_or_joint,
      laterality: a.laterality,
      testName: a.test_name,
      metricValue: a.metric_value !== null ? Number(a.metric_value) : null,
      metricUnit: a.metric_unit,
      symmetryPercentage: a.symmetry_percentage !== null ? Number(a.symmetry_percentage) : null,
      resultInterpretation: a.result_interpretation,
      notes: a.notes,
      createdAt: a.created_at,
    }))

    const mappedTests: InjuryMedicalTestDTO[] = (tests || []).map((t: any) => ({
      id: t.id,
      injuryId: t.injury_id,
      testType: t.test_type,
      testDate: t.test_date,
      facilityOrDoctor: t.facility_or_doctor,
      reportSummary: t.report_summary,
      keyFindings: t.key_findings,
      imageOrFileUrl: t.image_or_file_url,
      createdAt: t.created_at,
    }))

    const mappedTreats: InjuryTreatmentDTO[] = (treats || []).map((tr: any) => ({
      id: tr.id,
      injuryId: tr.injury_id,
      treatmentName: tr.treatment_name,
      treatmentCategory: tr.treatment_category,
      startDate: tr.start_date,
      endDate: tr.end_date,
      professionalName: tr.professional_name,
      responseToTreatment: tr.response_to_treatment,
      status: tr.status,
      notes: tr.notes,
      createdAt: tr.created_at,
    }))

    const mappedHistory: InjuryStatusHistoryDTO[] = (history || []).map((h: any) => ({
      id: h.id,
      injuryId: h.injury_id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      transitionDate: h.transition_date,
      reason: h.reason,
    }))

    return {
      success: true,
      details: {
        injury: mappedInjury,
        examinations: mappedExams,
        painRecords: mappedPain,
        functionalAssessments: mappedAssessments,
        medicalTests: mappedTests,
        treatments: mappedTreats,
        statusHistory: mappedHistory,
      },
    }
  } catch (err: any) {
    console.error("[getInjuryEpisodeDetailsAction] Error fatal:", err)
    return { success: false, error: err.message || "Error al consultar expediente clínico." }
  }
}

/**
 * Añade una nueva revisión clínica al historial sin sobrescribir revisiones previas.
 */
export async function addInjuryExaminationAction(input: {
  injuryId: string
  playerId: string
  examinationDate: string
  examinerName?: string
  painAtRest: number
  painOnPalpation: number
  painOnContraction: number
  painOnStretch: number
  functionalStatus: string
  clinicalFindings: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    // 1. Insertar examen clínico
    const { error: examErr } = await admin.from("injury_examinations").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        player_id: input.playerId,
        examination_date: input.examinationDate,
        examiner_id: context.profile.id,
        examiner_name: input.examinerName || `${context.profile.first_name || ""} ${context.profile.last_name || ""}`.trim() || "Fisioterapeuta",
        pain_at_rest: input.painAtRest,
        pain_on_palpation: input.painOnPalpation,
        pain_on_contraction: input.painOnContraction,
        pain_on_stretch: input.painOnStretch,
        functional_status: input.functionalStatus,
        clinical_findings: input.clinicalFindings,
        notes: input.notes || null,
      },
    ])

    if (examErr) return { success: false, error: examErr.message }

    // 2. Registrar en serie de dolor EVA
    const maxPain = Math.max(input.painAtRest, input.painOnPalpation, input.painOnContraction, input.painOnStretch)
    await admin.from("injury_pain_records").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        player_id: input.playerId,
        record_date: input.examinationDate,
        pain_score: maxPain,
        context: "revision_periodica",
        notes: `Dolor palpación: ${input.painOnPalpation}/10, contracción: ${input.painOnContraction}/10`,
      },
    ])

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al añadir revisión clínica" }
  }
}

/**
 * Añade una evaluación funcional (ROM o fuerza muscular) al expediente.
 */
export async function addFunctionalAssessmentAction(input: {
  injuryId: string
  assessmentDate: string
  assessmentType: "rom" | "fuerza" | "estabilidad"
  structureOrJoint: string
  laterality: string
  testName: string
  metricValue?: number
  metricUnit: string
  symmetryPercentage?: number
  resultInterpretation?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    const { error: fErr } = await admin.from("injury_functional_assessments").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        assessment_date: input.assessmentDate,
        assessment_type: input.assessmentType,
        structure_or_joint: input.structureOrJoint,
        laterality: input.laterality,
        test_name: input.testName,
        metric_value: input.metricValue ?? null,
        metric_unit: input.metricUnit,
        symmetry_percentage: input.symmetryPercentage ?? null,
        result_interpretation: input.resultInterpretation || "Evaluación clínica objetiva",
        notes: input.notes || null,
      },
    ])

    if (fErr) return { success: false, error: fErr.message }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al registrar valoración funcional" }
  }
}

/**
 * Añade una prueba médica o de imagen (Ecografía, RM, etc.).
 */
export async function addMedicalTestAction(input: {
  injuryId: string
  testType: string
  testDate: string
  facilityOrDoctor?: string
  reportSummary: string
  keyFindings?: string
  imageOrFileUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    const { error: tErr } = await admin.from("injury_medical_tests").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        test_type: input.testType,
        test_date: input.testDate,
        facility_or_doctor: input.facilityOrDoctor || null,
        report_summary: input.reportSummary,
        key_findings: input.keyFindings || null,
        image_or_file_url: input.imageOrFileUrl || null,
      },
    ])

    if (tErr) return { success: false, error: tErr.message }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al registrar prueba médica" }
  }
}

/**
 * Añade un tratamiento o terapia aplicada (fisioterapia, invasiva, etc.).
 */
export async function addInjuryTreatmentAction(input: {
  injuryId: string
  treatmentName: string
  treatmentCategory: string
  startDate: string
  endDate?: string
  professionalName?: string
  responseToTreatment?: string
  status?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    const { error: trErr } = await admin.from("injury_treatments").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        treatment_name: input.treatmentName,
        treatment_category: input.treatmentCategory,
        start_date: input.startDate,
        end_date: input.endDate || null,
        professional_name: input.professionalName || null,
        response_to_treatment: input.responseToTreatment || "favorable",
        status: input.status || "activo",
        notes: input.notes || null,
      },
    ])

    if (trErr) return { success: false, error: trErr.message }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al registrar tratamiento" }
  }
}

/**
 * Registra una transición de estado en el historial médico (injury_status_history)
 * y actualiza coherente y opcionalmente player_injuries.
 */
export async function transitionInjuryStatusAction(input: {
  injuryId: string
  newStatus: "activa" | "recuperado"
  newRtsPhase?: string
  reason: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    // 1. Obtener estado anterior
    const { data: currentInj } = await admin
      .from("player_injuries")
      .select("status, rts_phase, player_id")
      .eq("id", input.injuryId)
      .eq("club_id", clubId)
      .single()

    if (!currentInj) return { success: false, error: "Lesión no encontrada" }

    // 2. Registrar en injury_status_history
    await admin.from("injury_status_history").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        from_status: currentInj.status,
        to_status: input.newStatus,
        changed_by: context.profile.id,
        reason: input.reason,
      },
    ])

    // 3. Actualizar player_injuries
    const updatePayload: any = {
      status: input.newStatus,
    }
    if (input.newRtsPhase) updatePayload.rts_phase = input.newRtsPhase
    if (input.newStatus === "recuperado") {
      updatePayload.actual_return_date = new Date().toISOString().split("T")[0]
    }

    await admin.from("player_injuries").update(updatePayload).eq("id", input.injuryId).eq("club_id", clubId)

    try {
      revalidatePath(`/dashboard/club/jugador/${currentInj.player_id}`)
      revalidatePath(`/dashboard/players/${currentInj.player_id}/fisico-lesiones`)
    } catch {
      // ignore
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al actualizar estado del episodio" }
  }
}

// ==============================================================================
// FASE 6: DTOs Y SERVER ACTIONS PARA REHABILITACIÓN Y RETURN TO SPORT (RTS)
// ==============================================================================

export interface InjuryRehabSessionDTO {
  id: string
  clubId: string
  injuryId: string
  sessionDate: string
  rtsPhase: string
  specialistName: string | null
  sessionType: string
  totalDurationMinutes: number | null
  rpeLoad: number | null
  painExperienced: number | null
  exercisesSummary: string | null
  tolerance: string
  notes: string | null
  createdAt: string
}

export interface RtsCriteriaItem {
  id: string
  category: "dolor" | "rom" | "fuerza" | "campo" | "confianza" | "especifico"
  label: string
  description?: string
  status: "cumplido" | "pendiente" | "no_cumplido" | "no_evaluado"
  evidence?: string
  evaluatorName?: string
  evaluatedAt?: string
}

export interface InjuryRtsMilestoneDTO {
  id: string
  clubId: string
  injuryId: string
  stage: string
  targetDate: string | null
  achievedDate: string | null
  status: "pendiente" | "cumplido" | "no_cumplido"
  criteriaChecklist: RtsCriteriaItem[]
  clearedBy: string | null
  notes: string | null
  createdAt: string
}

export interface EpisodeRtsDetailsDTO {
  injury: PlayerInjuryDTO
  sessions: InjuryRehabSessionDTO[]
  milestones: InjuryRtsMilestoneDTO[]
  currentPhase: string
  averageRpe: number
  averageSessionPain: number
}

/**
 * Obtiene el expediente de readaptación y progresión RTS del episodio.
 */
export async function getInjuryRtsDetailsAction(injuryId: string): Promise<{
  success: boolean
  rtsDetails?: EpisodeRtsDetailsDTO
  error?: string
}> {
  try {
    if (!injuryId) return { success: false, error: "ID de lesión no especificado." }

    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    // 1. Obtener lesión
    const { data: inj, error: injErr } = await admin
      .from("player_injuries")
      .select("*")
      .eq("id", injuryId)
      .eq("club_id", clubId)
      .single()

    if (injErr || !inj) return { success: false, error: "Episodio no encontrado." }

    // 2. Obtener sesiones de rehabilitación
    const { data: sessions } = await admin
      .from("injury_rehabilitation_sessions")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)
      .order("session_date", { ascending: false })

    // 3. Obtener hitos RTS
    const { data: milestones } = await admin
      .from("injury_rts_milestones")
      .select("*")
      .eq("injury_id", injuryId)
      .eq("club_id", clubId)

    const mappedInjury: PlayerInjuryDTO = {
      id: inj.id,
      clubId: inj.club_id,
      playerId: inj.player_id,
      injuryDate: inj.injury_date,
      injuryType: inj.injury_type,
      notes: inj.notes,
      expectedReturnDate: inj.expected_return_date,
      status: inj.status,
      bodyView: inj.body_view,
      bodyRegion: inj.body_region,
      bodyStructure: inj.body_structure,
      bodySide: inj.body_side,
      laterality: inj.laterality,
      severity: inj.severity,
      estimatedMinDays: inj.estimated_min_days,
      estimatedMaxDays: inj.estimated_max_days,
      estimatedReturnFrom: inj.estimated_return_from,
      estimatedReturnTo: inj.estimated_return_to,
      actualReturnDate: inj.actual_return_date,
      createdAt: inj.created_at,
      updatedAt: inj.updated_at,
    }

    const mappedSessions: InjuryRehabSessionDTO[] = (sessions || []).map((s: any) => ({
      id: s.id,
      clubId: s.club_id,
      injuryId: s.injury_id,
      sessionDate: s.session_date,
      rtsPhase: s.rts_phase,
      specialistName: s.specialist_name,
      sessionType: s.session_type,
      totalDurationMinutes: s.total_duration_minutes,
      rpeLoad: s.rpe_load,
      painExperienced: s.pain_experienced,
      exercisesSummary: s.exercises_summary,
      tolerance: s.tolerance,
      notes: s.notes,
      createdAt: s.created_at,
    }))

    const mappedMilestones: InjuryRtsMilestoneDTO[] = (milestones || []).map((m: any) => ({
      id: m.id,
      clubId: m.club_id,
      injuryId: m.injury_id,
      stage: m.stage,
      targetDate: m.target_date,
      achievedDate: m.achieved_date,
      status: m.status || "pendiente",
      criteriaChecklist: Array.isArray(m.criteria_checklist) ? m.criteria_checklist : [],
      clearedBy: m.cleared_by,
      notes: m.notes,
      createdAt: m.created_at,
    }))

    // Métricas descriptivas de carga y respuesta
    const rpeValues = mappedSessions.map((s) => s.rpeLoad).filter((v): v is number => v !== null)
    const painValues = mappedSessions.map((s) => s.painExperienced).filter((v): v is number => v !== null)

    const avgRpe = rpeValues.length > 0 ? Number((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)) : 0
    const avgPain = painValues.length > 0 ? Number((painValues.reduce((a, b) => a + b, 0) / painValues.length).toFixed(1)) : 0

    return {
      success: true,
      rtsDetails: {
        injury: mappedInjury,
        sessions: mappedSessions,
        milestones: mappedMilestones,
        currentPhase: inj.rts_phase || "fase_1_aguda",
        averageRpe: avgRpe,
        averageSessionPain: avgPain,
      },
    }
  } catch (err: any) {
    console.error("[getInjuryRtsDetailsAction] Error fatal:", err)
    return { success: false, error: err.message || "Error al consultar detalles de readaptación RTS." }
  }
}

/**
 * Añade una sesión de rehabilitación o readaptación de campo.
 */
export async function addRehabilitationSessionAction(input: {
  injuryId: string
  sessionDate: string
  rtsPhase: string
  specialistName?: string
  sessionType: string
  totalDurationMinutes: number
  rpeLoad: number
  painExperienced: number
  exercisesSummary: string
  tolerance?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    const { error: sessErr } = await admin.from("injury_rehabilitation_sessions").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        session_date: input.sessionDate,
        rts_phase: input.rtsPhase,
        specialist_name: input.specialistName || `${context.profile.first_name || ""} ${context.profile.last_name || ""}`.trim() || "Readaptador",
        session_type: input.sessionType,
        total_duration_minutes: input.totalDurationMinutes,
        rpe_load: input.rpeLoad,
        pain_experienced: input.painExperienced,
        exercises_summary: input.exercisesSummary,
        tolerance: input.tolerance || "optima",
        notes: input.notes || null,
      },
    ])

    if (sessErr) return { success: false, error: sessErr.message }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al registrar sesión de rehabilitación." }
  }
}

/**
 * Guarda o actualiza el checklist de criterios de un hito Return to Sport específico.
 */
export async function saveRtsMilestoneCriteriaAction(input: {
  injuryId: string
  stage: string
  targetDate?: string
  achievedDate?: string
  status: "pendiente" | "cumplido" | "no_cumplido"
  criteriaChecklist: RtsCriteriaItem[]
  clearedBy?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    // Comprobar si ya existe el hito para esta lesión y etapa
    const { data: existing } = await admin
      .from("injury_rts_milestones")
      .select("id")
      .eq("injury_id", input.injuryId)
      .eq("stage", input.stage)
      .maybeSingle()

    const payload = {
      club_id: clubId,
      injury_id: input.injuryId,
      stage: input.stage,
      target_date: input.targetDate || null,
      achieved_date: input.achievedDate || null,
      status: input.status,
      criteria_checklist: input.criteriaChecklist,
      cleared_by: input.clearedBy || `${context.profile.first_name || ""} ${context.profile.last_name || ""}`.trim(),
      notes: input.notes || null,
    }

    if (existing) {
      const { error: upErr } = await admin.from("injury_rts_milestones").update(payload).eq("id", existing.id)
      if (upErr) return { success: false, error: upErr.message }
    } else {
      const { error: inErr } = await admin.from("injury_rts_milestones").insert([payload])
      if (inErr) return { success: false, error: inErr.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al guardar criterios RTS." }
  }
}

/**
 * Asienta la decisión explícita del profesional para avanzar de fase Return to Sport
 * y registra la transición en injury_status_history.
 */
export async function advanceRtsPhaseAction(input: {
  injuryId: string
  newPhase: string
  reason: string
  clearedBy?: string
  markRecoveredIfFinal?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) return { success: false, error: "No autenticado" }

    const clubId = context.profile.club_id
    if (!clubId) return { success: false, error: "Usuario sin club" }

    const admin = createAdminClient()

    const { data: currentInj } = await admin
      .from("player_injuries")
      .select("status, rts_phase, player_id")
      .eq("id", input.injuryId)
      .single()

    if (!currentInj) return { success: false, error: "Lesión no encontrada" }

    const updatePayload: any = {
      rts_phase: input.newPhase,
    }

    // Si avanza a Return to Performance o final y el profesional lo declara recuperado
    if (input.markRecoveredIfFinal || input.newPhase === "fase_8_performance" || input.newPhase === "fase_7_rts") {
      if (input.markRecoveredIfFinal) {
        updatePayload.status = "recuperado"
        updatePayload.actual_return_date = new Date().toISOString().split("T")[0]
      }
    }

    await admin.from("player_injuries").update(updatePayload).eq("id", input.injuryId).eq("club_id", clubId)

    // Registrar en injury_status_history
    await admin.from("injury_status_history").insert([
      {
        club_id: clubId,
        injury_id: input.injuryId,
        from_status: currentInj.status,
        to_status: updatePayload.status || currentInj.status,
        changed_by: context.profile.id,
        reason: `Avance a fase RTS '${input.newPhase}': ${input.reason}`,
      },
    ])

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Error al avanzar fase Return to Sport." }
  }
}
