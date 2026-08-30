import { useState, useTransition, useRef } from "react"
import { Sparkles, Save, CheckCircle2, AlertCircle, Users, Star, BarChart2, FileText, Loader2, Mic, MicOff, Send, MessageSquare, TrendingUp } from "lucide-react"
import { saveMatchReport, sendMatchSummaryToCoordinatorsAction } from "@/app/actions/match-actions"
import { generateMatchAIReportAction } from "@/app/actions/match-ai-report-actions"
import { Button } from "@/components/ui/button"
import { MatchFullReportModal } from "./MatchFullReportModal"
import { MatchTrendsModal } from "./MatchTrendsModal"
import { useSearchParams } from "next/navigation"
import { toast } from "react-hot-toast"

export function PostMatchTab({ matchId, initialData, players = [], convocatorias = [], allMatches = [] }: { matchId: string, initialData?: any, players?: any[], convocatorias?: any[], allMatches?: any[] }) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition()
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showFullReportModal, setShowFullReportModal] = useState(() => searchParams.get("action") === "pasar-lista");
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [hasConfirmedAiWarning, setHasConfirmedAiWarning] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);

  const [rating, setRating] = useState<string>(initialData?.coach_rating?.toString() || "7")
  const [summary, setSummary] = useState(initialData?.coach_summary || "")
  const [positive, setPositive] = useState(initialData?.positive_aspects || "")
  const [improvement, setImprovement] = useState(initialData?.improvement_aspects || "")
  const [attitude, setAttitude] = useState(initialData?.attitude_notes || "")

  // Dictado por Voz (SpeechRecognition API)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Tu navegador no soporta el reconocimiento de voz. Usa Chrome, Edge o Safari.");
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.success("🎙️ Escuchando... Habla tu valoración del partido");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          setSummary((prev: string) => (prev ? `${prev.trim()} ${text}` : text));
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsRecording(false);
        toast.error("Error en el reconocimiento de voz");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo iniciar el dictado por voz");
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Dictado finalizado");
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveMatchReport(matchId, {
        coach_rating: parseInt(rating),
        coach_summary: summary,
        positive_aspects: positive,
        improvement_aspects: improvement,
        attitude_notes: attitude
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  const handleGenerateAIReport = async () => {
    if (!summary.trim() && !hasConfirmedAiWarning) {
      toast.error("Para que el análisis sea lo más fehaciente posible, el entrenador debe dejar primero su valoración.", {
        duration: 5000,
        icon: "⚠️"
      });
      setHasConfirmedAiWarning(true);
      return;
    }

    setIsAiLoading(true)
    const toastId = toast.loading("Analizando datos del partido y valoraciones tácticas...")
    try {
      const res = await generateMatchAIReportAction(matchId)
      if (res.success && res.data) {
        setRating(res.data.coach_rating.toString())
        // Mantenemos intacta la Valoración General del Entrenador (summary) y colocamos el informe IA en el Resumen General del Partido (attitude)
        if (res.data.coach_summary) {
          setAttitude(res.data.coach_summary);
        } else if (res.data.attitude_notes) {
          setAttitude(res.data.attitude_notes);
        }
        setPositive(res.data.positive_aspects)
        setImprovement(res.data.improvement_aspects)
        toast.success("¡Informe generado con éxito!", { id: toastId })
        setHasConfirmedAiWarning(false);
      } else {
        toast.error(res.error || "No se pudo generar el informe.", { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con la IA.", { id: toastId })
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {showFullReportModal && (
        <MatchFullReportModal
          matchId={matchId}
          matchDate={initialData?.fecha_hora || ""}
          teamId={initialData?.equipo_id || ""}
          players={players}
          convocatorias={convocatorias}
          onClose={() => setShowFullReportModal(false)}
        />
      )}

      {showTrendsModal && (
        <MatchTrendsModal
          allMatches={allMatches}
          currentMatchId={matchId}
          onClose={() => setShowTrendsModal(false)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Informe Técnico del Partido</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Análisis táctico, rendimiento y evaluación post-partido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTrendsModal(true)}
            className="px-3.5 py-2.5 border border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Tendencias Multi-Partido
          </button>
          <button
            onClick={() => setShowFullReportModal(true)}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 group shadow-sm hover:shadow"
          >
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            Rellenar Informe Completo
          </button>
          <Button 
            variant="outline" 
            disabled={isAiLoading}
            onClick={handleGenerateAIReport}
            className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-bold"
          >
            {isAiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
            {isAiLoading ? "Generando..." : "Análisis IA"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Rating y Resumen */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
              Nota del Partido (1-10)
            </label>
            <select 
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full text-2xl font-black text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>Nota: {n}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                Valoración General del Entrenador
              </label>
              <button
                type="button"
                onClick={isRecording ? stopVoiceDictation : startVoiceDictation}
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  isRecording 
                    ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md" 
                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                }`}
                title={isRecording ? "Detener dictado por voz" : "Dictar valoración por voz"}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? "Grabando..." : "Dictar por Voz"}</span>
              </button>
            </div>
            <textarea 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Escribe o dicta por voz la opinión táctica y sensaciones del partido..."
              className="w-full h-40 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            {/* Opciones de envío al Coordinador */}
            <div className="mt-3 bg-slate-100/80 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                Enviar Valoración
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSendingSummary || !summary.trim()}
                  onClick={async () => {
                    if (!summary.trim()) {
                      toast.error("Escribe primero una valoración antes de enviar.");
                      return;
                    }
                    setIsSendingSummary(true);
                    const toastId = toast.loading("Enviando valoración al coordinador...");
                    const res = await sendMatchSummaryToCoordinatorsAction(matchId, summary);
                    setIsSendingSummary(false);
                    if (res.success) {
                      toast.success(res.message || "Valoración enviada correctamente", { id: toastId });
                    } else {
                      toast.error(res.error || "Error al enviar la valoración.", { id: toastId });
                    }
                  }}
                  className="py-2 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>App Interna</span>
                </button>

                <button
                  type="button"
                  disabled={!summary.trim()}
                  onClick={async () => {
                    if (!summary.trim()) {
                      toast.error("Escribe primero una valoración antes de enviar.");
                      return;
                    }
                    const text = encodeURIComponent(`📋 *Valoración del Partido*\n\n"${summary.trim()}"`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                    toast.success("Abriendo WhatsApp para compartir la valoración...");
                  }}
                  className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Aspectos */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600 tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> Aspectos Positivos
              </label>
              <textarea 
                value={positive}
                onChange={(e) => setPositive(e.target.value)}
                placeholder="¿Qué se hizo bien táctica, física o mentalmente? (Presión, posesión...)"
                className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-black uppercase text-red-500 tracking-wider mb-2">
                <AlertCircle className="w-4 h-4" /> Aspectos a Mejorar
              </label>
              <textarea 
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="Errores detectados, faltas de concentración o debilidades tácticas..."
                className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-indigo-700 tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> RESUMEN GENERAL DEL PARTIDO
            </label>
            <textarea 
              value={attitude}
              onChange={(e) => setAttitude(e.target.value)}
              placeholder="Resumen general del partido generado por la IA basándose en los datos recabados en vivo y las observaciones del entrenador..."
              className="w-full h-36 resize-none rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
            >
              {isPending ? <span className="animate-spin text-xl leading-none">⟳</span> : <Save className="w-4 h-4" />}
              {success ? "Guardado Correctamente" : "Guardar Informe"}
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
