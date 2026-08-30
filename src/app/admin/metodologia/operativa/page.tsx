"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Clock,
  Sparkles,
  Check,
  ArrowRight,
  Play,
  FileText,
  Plus,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  X,
  Target,
  Shield,
  Brain,
  Scale,
  History,
  AlertCircle,
  Edit,
  RotateCcw,
  Zap,
  Info,
  CheckSquare
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import {
  OperationalAlertService,
  DecisionWorkflowService,
  InterventionService,
  FollowUpService,
  OperationalSnapshotService,
  OperationalAuditService,
  OperationalAlert,
  DecisionWorkflow,
  InterventionRecord,
  FollowUpRecord,
  OperationalAuditEntry,
  DecisionActor
} from "@/lib/methodology/operationalCenter";

interface Team {
  id: string;
  name: string;
  category?: string;
}

const DEFAULT_ACTOR: DecisionActor = {
  userId: "user-current-director",
  userName: "Director Metodológico",
  role: "metodologo"
};

function OperativaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const alertService = useMemo(() => OperationalAlertService.getInstance(), []);
  const workflowService = useMemo(() => DecisionWorkflowService.getInstance(), []);
  const interventionService = useMemo(() => InterventionService.getInstance(), []);
  const followUpService = useMemo(() => FollowUpService.getInstance(), []);
  const snapshotService = useMemo(() => OperationalSnapshotService.getInstance(), []);
  const auditService = useMemo(() => OperationalAuditService.getInstance(), []);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Pestañas
  const [activeTab, setActiveTab] = useState<"alertas" | "decisiones" | "intervenciones" | "auditoria">("alertas");

  // Datos reales
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [pendingDecisions, setPendingDecisions] = useState<DecisionWorkflow[]>([]);
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<OperationalAuditEntry[]>([]);

  // Modales
  const [rejectModal, setRejectModal] = useState<{ open: boolean; workflowId: string; conceptName: string }>({ open: false, workflowId: "", conceptName: "" });
  const [rejectionReason, setRejectionReason] = useState("");

  const [modifyModal, setModifyModal] = useState<{ open: boolean; workflow: DecisionWorkflow | null }>({ open: false, workflow: null });
  const [modifyAction, setModifyAction] = useState<any>("PRIORITIZE");
  const [modifyPriority, setModifyPriority] = useState<any>("HIGH");
  const [modifyNotes, setModifyNotes] = useState("");

  const [completeInterventionModal, setCompleteInterventionModal] = useState<{ open: boolean; intervention: InterventionRecord | null }>({ open: false, intervention: null });
  const [postScore, setPostScore] = useState<number>(4);
  const [coachNotes, setCoachNotes] = useState("");

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamOperationalData(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, category")
        .order("name", { ascending: true });

      if (teamsData && teamsData.length > 0) {
        setTeams(teamsData);
        setSelectedTeamId(teamsData[0].id);
      }
    } catch (err) {
      console.error("Error cargando equipos en Centro Operativo:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamOperationalData = async (teamId: string) => {
    try {
      // 1. Cargar Sesiones recientes de Supabase
      const { data: sessions } = await supabase
        .from("training_sessions")
        .select("*, session_evaluations(*, session_behaviour_evaluations(*))")
        .eq("team_id", teamId)
        .order("date_time", { ascending: false })
        .limit(6);

      setRecentSessions(sessions || []);

      // 2. Analizar sesiones y detectar alertas operativas automáticas
      if (sessions && sessions.length > 0) {
        sessions.forEach((s) => {
          const evalItem = s.session_evaluations?.[0];
          if (evalItem) {
            // Alerta por RPE Excesivo (fatiga)
            if (evalItem.session_rpe >= 8) {
              alertService.createAlert({
                teamId,
                type: "STAGNANT_PRIORITY",
                severity: "HIGH",
                title: `RPE Elevado (${evalItem.session_rpe}/10) en sesión ${s.objective || "General"}`,
                description: `Se registró una percepción de esfuerzo de ${evalItem.session_rpe}/10 superior al umbral de seguridad. Conviene modular cargas.`,
                sourceModule: "Module 8 - Session RPE Monitor",
                sourceEntityId: s.id,
                evidence: [`Sesión ${s.id}`, `RPE=${evalItem.session_rpe}`, `Fecha: ${s.date_time}`],
                assignedRole: "entrenador"
              });
            }

            // Alerta por Logro de Objetivo Bajo
            if (evalItem.objective_achievement <= 2) {
              alertService.createAlert({
                teamId,
                type: "UNADDRESSED_CRITICAL_NEED",
                severity: "CRITICAL",
                title: `Bajo Logro de Objetivo (${evalItem.objective_achievement}/4): ${s.objective || "Objetivo Táctico"}`,
                description: `El objetivo "${s.objective}" no alcanzó el umbral mínimo de asimilación en campo.`,
                sourceModule: "Module 8 - Formative Acquisition",
                sourceEntityId: s.id,
                evidence: [`Logro=${evalItem.objective_achievement}/4`, `Objetivo: ${s.objective}`],
                assignedRole: "director_metodologico"
              });
            }
          }
        });
      }

      refreshLocalData(teamId);

    } catch (err) {
      console.error("Error cargando operativa del equipo:", err);
    }
  };

  const refreshLocalData = (teamId: string) => {
    const teamAlerts = alertService.getAlertsByTeam(teamId);
    const teamDecisions = workflowService.getDecisionsByTeam(teamId);
    const teamInterventions = interventionService.getInterventionsByTeam(teamId);
    const teamAudit = auditService.getAuditLog(teamId);

    setAlerts(teamAlerts);
    setPendingDecisions(teamDecisions);
    setInterventions(teamInterventions);
    setAuditLogs(teamAudit);
  };

  // Acciones de Decisión
  const handleApproveDecision = (workflowId: string) => {
    workflowService.approveDecision(workflowId, DEFAULT_ACTOR);
    refreshLocalData(selectedTeamId);
  };

  const handleOpenModify = (wf: DecisionWorkflow) => {
    setModifyModal({ open: true, workflow: wf });
    setModifyAction(wf.recommendedAction);
    setModifyPriority(wf.recommendedPriority);
    setModifyNotes("");
  };

  const handleSaveModify = () => {
    if (!modifyModal.workflow) return;
    workflowService.modifyDecision(
      modifyModal.workflow.id,
      DEFAULT_ACTOR,
      {
        notes: modifyNotes || "Modificación validada por Dirección Metodológica",
        action: modifyAction,
        priority: modifyPriority
      }
    );
    setModifyModal({ open: false, workflow: null });
    refreshLocalData(selectedTeamId);
  };

  const handleOpenReject = (wf: DecisionWorkflow) => {
    setRejectModal({ open: true, workflowId: wf.id, conceptName: wf.conceptName });
    setRejectionReason("");
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      alert("Es obligatorio justificar el motivo del rechazo metodológico.");
      return;
    }
    workflowService.rejectDecision(rejectModal.workflowId, DEFAULT_ACTOR, rejectionReason);
    setRejectModal({ open: false, workflowId: "", conceptName: "" });
    refreshLocalData(selectedTeamId);
  };

  // Crear propuesta manual de intervención a partir de una alerta
  const handleCreateDecisionFromAlert = (alertItem: OperationalAlert) => {
    const currentTeam = teams.find((t) => t.id === selectedTeamId);
    workflowService.createWorkflowProposal({
      teamId: selectedTeamId,
      category: currentTeam?.category || "General",
      conceptName: alertItem.title,
      competencyId: alertItem.competencyId,
      recommendedAction: "PRIORITIZE",
      recommendedPriority: alertItem.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      confidenceScore: 0.88,
      confidenceLevel: "HIGH",
      evidence: alertItem.evidence,
      suggestedDurationMinutes: 75
    });
    alertService.resolveAlert(alertItem.id, DEFAULT_ACTOR, "Propuesta de decisión metodológica generada en el workflow");
    refreshLocalData(selectedTeamId);
    setActiveTab("decisiones");
  };

  // Completar Intervención
  const handleOpenCompleteIntervention = (intervention: InterventionRecord) => {
    setCompleteInterventionModal({ open: true, intervention });
    setPostScore(4);
    setCoachNotes("");
  };

  const handleSaveCompleteIntervention = () => {
    if (!completeInterventionModal.intervention) return;
    interventionService.completeIntervention(
      completeInterventionModal.intervention.id,
      {
        postInterventionScore: postScore,
        coachObservations: coachNotes || "Intervención completada en sesión programada"
      }
    );
    setCompleteInterventionModal({ open: false, intervention: null });
    refreshLocalData(selectedTeamId);
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const openAlertsCount = alerts.filter((a) => a.status === "OPEN").length;
  const pendingDecisionsCount = pendingDecisions.filter((d) => d.status === "PENDING").length;
  const activeInterventionsCount = interventions.filter((i) => i.status === "PLANNED" || i.status === "IN_PROGRESS").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 tracking-wider">
              Centro Operativo & Workflow Metodológico
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-purple-600 shrink-0" />
            Centro Operativo del Club
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Supervisión diaria: detección de alertas con evidencia, validación humana de decisiones (Human-in-the-Loop) y seguimiento de intervenciones.
          </p>
        </div>

        {/* Selector de Equipo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.category ? `(${t.category})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards de Salud Operativa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Alertas Abiertas</span>
            <AlertTriangle className={`w-4 h-4 ${openAlertsCount > 0 ? "text-rose-600" : "text-slate-400"}`} />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{openAlertsCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Requieren atención metodológica</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Decisiones Pendientes</span>
            <Scale className={`w-4 h-4 ${pendingDecisionsCount > 0 ? "text-purple-600" : "text-slate-400"}`} />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pendingDecisionsCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Revisión humana requerida</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Intervenciones Activas</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{activeInterventionsCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">En planificación / ejecución</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Sesiones Registradas</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{recentSessions.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Últimas sesiones del equipo</p>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl border shadow-xs gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("alertas")}
          className={`pb-3 px-3 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "alertas"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>1. Alertas & Sesiones ({openAlertsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("decisiones")}
          className={`pb-3 px-3 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "decisiones"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>2. Decisiones Humanas ({pendingDecisionsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("intervenciones")}
          className={`pb-3 px-3 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "intervenciones"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>3. Intervenciones & Seguimiento ({interventions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`pb-3 px-3 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "auditoria"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>4. Registro de Auditoría ({auditLogs.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-xs font-bold text-slate-500">Cargando datos operativos reales...</p>
        </div>
      ) : activeTab === "alertas" ? (
        
        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 1: ALERTAS Y SESIONES RECIENTES
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Feed de Alertas Metodológicas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                Alertas Operativas Activas
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800">Sin anomalías detectadas</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Todas las sesiones y parámetros de carga del equipo se encuentran dentro de los rangos formativos óptimos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((al) => {
                  const isCritical = al.severity === "CRITICAL";
                  const isHigh = al.severity === "HIGH";
                  return (
                    <div
                      key={al.id}
                      className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3 transition-all ${
                        isCritical ? "border-rose-300 bg-rose-50/20" : isHigh ? "border-amber-300" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                              isCritical ? "bg-rose-100 text-rose-800" : isHigh ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                            }`}>
                              Severidad: {al.severity}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{al.type}</span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900">{al.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{al.description}</p>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          al.status === "OPEN" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {al.status}
                        </span>
                      </div>

                      {/* Evidencias */}
                      {al.evidence && al.evidence.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Evidencia:</span>
                          {al.evidence.map((ev, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {ev}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Acciones Rápidas */}
                      {al.status === "OPEN" && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              alertService.dismissAlert(al.id, DEFAULT_ACTOR, "Descartada por el usuario");
                              refreshLocalData(selectedTeamId);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Descartar
                          </button>
                          <button
                            onClick={() => handleCreateDecisionFromAlert(al)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Scale className="w-3 h-3" />
                            <span>Crear Decisión Metodológica</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de Sesiones Recientes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Sesiones Recientes
              </h3>
              <Link
                href="/admin/metodologia/sesiones/nueva"
                className="text-xs font-bold text-purple-600 hover:underline"
              >
                + Nueva
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                Sin sesiones registradas recientemente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((s) => {
                  const ev = s.session_evaluations?.[0];
                  return (
                    <div key={s.id} className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-slate-900 line-clamp-1">{s.objective || "Sesión General"}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {s.date_time ? new Date(s.date_time).toLocaleDateString("es-ES") : "Sin fecha"} • {s.duration_minutes || 90} min
                          </div>
                        </div>

                        <Link
                          href={`/admin/metodologia/sesiones/${s.id}/evaluacion`}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Evaluar Sesión"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {ev ? (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-600 font-bold">
                          <span>RPE: <strong className="text-slate-900">{ev.session_rpe}/10</strong></span>
                          <span>Logro: <strong className="text-slate-900">{ev.objective_achievement}/4</strong></span>
                          <span className="text-emerald-600 font-black">Evaluada</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 font-bold pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Pendiente de evaluación</span>
                          <Link href={`/admin/metodologia/sesiones/${s.id}/evaluacion`} className="underline">
                            Cerrar sesión →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      ) : activeTab === "decisiones" ? (

        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 2: WORKFLOW DE DECISIONES HUMANAS (HUMAN-IN-THE-LOOP)
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                Decisiones Metodológicas Requeridas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Las sugerencias automáticas de la IA requieren validación humana (Aprobar, Modificar o Rechazar con motivo).
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {pendingDecisions.length} decisiones en registro
            </span>
          </div>

          {pendingDecisions.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center shadow-xs space-y-2">
              <CheckSquare className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-black text-slate-800">No hay decisiones pendientes</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No existen propuestas pendientes de revisión para {selectedTeam?.name || "este equipo"}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDecisions.map((wf) => {
                const isPending = wf.status === "PENDING";
                const isApproved = wf.status === "APPROVED";
                const isRejected = wf.status === "REJECTED";
                const isModified = wf.status === "MODIFIED";

                return (
                  <div
                    key={wf.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                          isPending ? "bg-amber-100 text-amber-800 border border-amber-200" : isApproved ? "bg-emerald-100 text-emerald-800" : isRejected ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          Estado: {wf.status}
                        </span>

                        <span className="text-[10px] font-bold text-slate-400">
                          Confianza: {Math.round(wf.confidenceScore * 100)}%
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900">{wf.conceptName}</h4>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Acción Recomendada:</span>
                          <span className="font-black text-slate-800">{wf.recommendedAction}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Prioridad Sugerida:</span>
                          <span className="font-black text-purple-700">{wf.recommendedPriority}</span>
                        </div>
                      </div>

                      {/* Evidencia */}
                      {wf.evidence && wf.evidence.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidencias observadas:</span>
                          <ul className="text-[11px] text-slate-600 space-y-0.5">
                            {wf.evidence.map((ev, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-purple-500" />
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Detalle de Decisión Humana */}
                      {wf.humanDecision && (
                        <div className="mt-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-purple-900 flex items-center justify-between">
                            <span>Decidido por: {wf.humanDecision.decidedBy.userName}</span>
                            <span className="text-[10px] text-purple-400 font-medium">
                              {new Date(wf.humanDecision.decidedAt).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          {wf.humanDecision.rejectionReason && (
                            <p className="text-rose-700 italic">Motivo de rechazo: {wf.humanDecision.rejectionReason}</p>
                          )}
                          {wf.humanDecision.modifications && (
                            <p className="text-blue-700">Modificación: {wf.humanDecision.modifications}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botones de Decisión Humana */}
                    {isPending && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReject(wf)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModify(wf)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Modificar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveDecision(wf.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
                        >
                          Aprobar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : activeTab === "intervenciones" ? (

        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 3: INTERVENCIONES Y SEGUIMIENTO PRE -> POST
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Intervenciones Pedagógicas en Campo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento longitudinal: Evaluación PRE → Intervención → Evaluación POST → Cálculo de Impacto (Δ).
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {interventions.length} intervenciones registradas
            </span>
          </div>

          {interventions.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center shadow-xs space-y-2">
              <Target className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-black text-slate-800">Sin intervenciones activas</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Al aprobar una decisión metodológica, se creará automáticamente la ficha de intervención para su seguimiento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interventions.map((inv) => {
                const isCompleted = inv.status === "COMPLETED";
                const isPositive = inv.outcome === "POSITIVE";
                const isPartial = inv.outcome === "PARTIAL";

                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase ${
                          isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                        }`}>
                          {inv.status}
                        </span>

                        <span className="text-xs font-bold text-slate-400">
                          Programada: {inv.scheduledDate}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900">{inv.conceptName}</h4>

                      {/* Comparativa PRE vs POST */}
                      <div className="grid grid-cols-3 gap-2 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Score PRE</span>
                          <span className="font-black text-slate-700">{inv.preInterventionScore} / 5</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Score POST</span>
                          <span className="font-black text-slate-900">{inv.postInterventionScore ? `${inv.postInterventionScore} / 5` : "Pendiente"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Impacto (Δ)</span>
                          <span className={`font-black ${
                            (inv.scoreDelta || 0) > 0 ? "text-emerald-600" : (inv.scoreDelta || 0) < 0 ? "text-rose-600" : "text-slate-500"
                          }`}>
                            {inv.scoreDelta !== undefined ? `${inv.scoreDelta > 0 ? "+" : ""}${inv.scoreDelta}` : "—"}
                          </span>
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">Resultado Metodológico:</span>
                            <span className={`font-black px-2 py-0.5 rounded text-[10px] ${
                              isPositive ? "bg-emerald-100 text-emerald-800" : isPartial ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                            }`}>
                              {inv.outcome}
                            </span>
                          </div>
                          {inv.coachObservations && (
                            <p className="text-slate-500 italic mt-1">{inv.coachObservations}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {!isCompleted && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteIntervention(inv)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Registrar Evaluación POST</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (

        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 4: REGISTRO DE AUDITORÍA INMUTABLE
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Auditoría Inmutable de Decisiones Operativas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trazabilidad completa de actores, acciones, roles y justificaciones registradas en el sistema.
              </p>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center shadow-xs space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-base font-black text-slate-800">Sin eventos de auditoría</h4>
              <p className="text-xs text-slate-400">Las acciones humanas quedarán registradas aquí.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">
                          {log.entityType}
                        </span>
                        <span className="font-bold text-slate-900">{log.action}</span>
                      </div>
                      {log.reason && (
                        <p className="text-slate-600 text-[11px] italic">"{log.reason}"</p>
                      )}
                    </div>

                    <div className="text-right shrink-0 text-slate-400 text-[11px]">
                      <div className="font-bold text-slate-700">{log.actor.userName} ({log.actor.role})</div>
                      <div>{new Date(log.timestamp).toLocaleString("es-ES")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL DE RECHAZO CON JUSTIFICACIÓN OBLIGATORIA
      ═════════════════════════════════════════════════════════════════════════ */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-black text-slate-900">Rechazar Decisión Metodológica</h3>
              <p className="text-xs text-slate-500 mt-0.5">{rejectModal.conceptName}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Motivo del Rechazo (Obligatorio) <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Indica la razón táctica, física o metodológica por la que se descarta la propuesta..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, workflowId: "", conceptName: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL DE MODIFICACIÓN DE DECISIÓN
      ═════════════════════════════════════════════════════════════════════════ */}
      {modifyModal.open && modifyModal.workflow && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-black text-slate-900">Modificar Decisión</h3>
              <p className="text-xs text-slate-500 mt-0.5">{modifyModal.workflow.conceptName}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Acción Final</label>
                <select
                  value={modifyAction}
                  onChange={(e) => setModifyAction(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800"
                >
                  <option value="PRIORITIZE">PRIORITIZE (Priorizar en microciclo)</option>
                  <option value="MAINTAIN_MONITORING">MAINTAIN_MONITORING (Mantener monitoreo)</option>
                  <option value="DELOAD">DELOAD (Descargar / Pausar)</option>
                  <option value="INTENSIFY">INTENSIFY (Intensificar)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Prioridad Final</label>
                <select
                  value={modifyPriority}
                  onChange={(e) => setModifyPriority(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800"
                >
                  <option value="CRITICAL">CRITICAL (Crítica inmediata)</option>
                  <option value="HIGH">HIGH (Alta)</option>
                  <option value="MEDIUM">MEDIUM (Media)</option>
                  <option value="LOW">LOW (Baja)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Justificación del Ajuste</label>
                <textarea
                  rows={2}
                  placeholder="Explica el motivo del cambio de pauta..."
                  value={modifyNotes}
                  onChange={(e) => setModifyNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModifyModal({ open: false, workflow: null })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModify}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
              >
                Guardar Modificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL DE REGISTRO DE EVALUACIÓN POST-INTERVENCIÓN
      ═════════════════════════════════════════════════════════════════════════ */}
      {completeInterventionModal.open && completeInterventionModal.intervention && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-black text-slate-900">Evaluar Intervención Realizada</h3>
              <p className="text-xs text-slate-500 mt-0.5">{completeInterventionModal.intervention.conceptName}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600">Puntuación PRE:</span>
                <span className="font-black text-slate-900">{completeInterventionModal.intervention.preInterventionScore} / 5</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Puntuación POST Observada (1 a 5)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPostScore(lvl)}
                      className={`p-2.5 rounded-xl border font-black text-center transition-all ${
                        postScore === lvl
                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas del Entrenador / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre la asimilación del concepto tras el entrenamiento..."
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteInterventionModal({ open: false, intervention: null })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCompleteIntervention}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
              >
                Cerrar Intervención
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MethodologyOperativeDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-xs font-bold text-slate-500">Cargando Centro Operativo...</p>
      </div>
    }>
      <OperativaContent />
    </Suspense>
  );
}
