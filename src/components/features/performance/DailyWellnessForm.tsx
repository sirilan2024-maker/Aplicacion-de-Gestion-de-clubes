"use client";

import { useState } from "react";
import { submitDailyWellness } from "@/app/actions/feedback-actions";
import { 
  Moon, 
  BatteryCharging, 
  Activity, 
  Brain, 
  Smile, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert, 
  Info,
  Calendar,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { WELLNESS_CONFIG } from "@/lib/performance/wellness-config";

export interface PlayerOption {
  id: string;
  first_name: string;
  last_name: string;
}

export interface DailyWellnessFormProps {
  eventId: string;
  eventDetails: any;
  players: PlayerOption[];
  initialPlayerId?: string;
  isLockedPlayer?: boolean;
  token?: string;
  tokenExp?: number;
  teamName: string;
  isDemo?: boolean;
}

export function DailyWellnessForm({
  eventId,
  eventDetails,
  players,
  initialPlayerId = "",
  isLockedPlayer = false,
  token,
  tokenExp,
  teamName,
  isDemo = false,
}: DailyWellnessFormProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);

  // Escala Hooper 1 a 5 (inicialmente 0 para exigir respuesta activa)
  const [sleepQuality, setSleepQuality] = useState<number>(0);
  const [fatigue, setFatigue] = useState<number>(0);
  const [soreness, setSoreness] = useState<number>(0);
  const [stress, setStress] = useState<number>(0);
  const [mood, setMood] = useState<number>(0);

  // Molestias
  const [hasDiscomfort, setHasDiscomfort] = useState(false);
  const [zone, setZone] = useState("");
  const [intensity, setIntensity] = useState<number>(5);
  const [notes, setNotes] = useState("");

  // Estado del formulario
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    status: 'idle' | 'success' | 'partial' | 'error';
    message?: string;
    warning?: string;
  }>({ status: 'idle' });

  // Sugerencias de zonas anatómicas derivadas de la configuración aprobada por Joaquín
  const quickZones = WELLNESS_CONFIG.discomfortQuestion.anatomicalZones;

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedPlayerId) {
      errors.player = "Debes seleccionar tu nombre.";
    }
    if (sleepQuality < 1 || sleepQuality > 5) {
      errors.sleep = "Valora la calidad del sueño (1 a 5).";
    }
    if (fatigue < 1 || fatigue > 5) {
      errors.fatigue = "Indica tu nivel de fatiga (1 a 5).";
    }
    if (soreness < 1 || soreness > 5) {
      errors.soreness = "Valora el dolor muscular o agujetas (1 a 5).";
    }
    if (stress < 1 || stress > 5) {
      errors.stress = "Indica tu nivel de estrés (1 a 5).";
    }
    if (mood < 1 || mood > 5) {
      errors.mood = "Valora tu estado de ánimo (1 a 5).";
    }

    if (hasDiscomfort) {
      if (!zone || zone.trim() === "") {
        errors.zone = "Indica la zona anatómica de la molestia.";
      }
      if (intensity < 1 || intensity > 10) {
        errors.intensity = "La intensidad debe estar entre 1 y 10.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, completa todas las preguntas obligatorias antes de enviar.");
      return;
    }

    if (isDemo) {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setSubmitResult({
          status: 'success',
          message: "Modo Demostración: Cuestionario validado con éxito. El guardado en base de datos está desactivado en este modo para garantizar el aislamiento total.",
        });
        toast.success("Demostración: Validación completada");
      }, 300);
      return;
    }

    setSubmitting(true);

    try {
      const res = await submitDailyWellness({
        eventId,
        playerId: selectedPlayerId,
        sleepQuality,
        fatigue,
        soreness,
        stress,
        mood,
        hasDiscomfort,
        zone: hasDiscomfort ? zone.trim() : null,
        intensity: hasDiscomfort ? intensity : null,
        notes: hasDiscomfort && notes.trim() !== "" ? notes.trim() : null,
        options: token && tokenExp ? { token, tokenExp } : undefined,
      });

      setSubmitting(false);

      if (res.success) {
        if (res.persistenceStatus === 'partial') {
          setSubmitResult({
            status: 'partial',
            message: "Tus respuestas han sido recibidas y comunicadas al cuerpo técnico.",
            warning: res.warning || "La persistencia complementaria se sincronizará en la próxima actualización.",
          });
        } else {
          setSubmitResult({
            status: 'success',
            message: "¡Cuestionario de Bienestar registrado con éxito!",
          });
        }
      } else {
        setSubmitResult({
          status: 'error',
          message: res.error || "No se pudo registrar tu cuestionario. Por favor, inténtalo más tarde.",
        });
        toast.error(res.error || "Error al procesar el cuestionario.");
      }
    } catch (err: any) {
      setSubmitting(false);
      setSubmitResult({
        status: 'error',
        message: "Ocurrió un error inesperado de conexión al enviar el cuestionario.",
      });
      toast.error("Error inesperado al enviar los datos.");
    }
  };

  // Pantalla de Confirmación de Éxito o Parcial
  if (submitResult.status === 'success' || submitResult.status === 'partial') {
    const isPartial = submitResult.status === 'partial';
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-6 md:p-8 text-center animate-in zoom-in duration-300">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isPartial ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>
          {isPartial ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {isPartial ? "Respuestas Recibidas" : "¡Cuestionario Completado!"}
        </h2>

        <p className="text-gray-600 font-medium mb-4">
          {submitResult.message}
        </p>

        {isPartial && submitResult.warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-800 text-left flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso de sincronización:</p>
              <p className="mt-0.5">{submitResult.warning}</p>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left text-xs text-slate-600 space-y-1 mb-6">
          <p className="font-bold text-slate-800">Resumen del registro previo:</p>
          <p>• Calidad de sueño: <span className="font-semibold">{sleepQuality} / 5</span></p>
          <p>• Fatiga percibida: <span className="font-semibold">{fatigue} / 5</span></p>
          <p>• Dolor muscular: <span className="font-semibold">{soreness} / 5</span></p>
          <p>• Nivel de estrés: <span className="font-semibold">{stress} / 5</span></p>
          <p>• Estado de ánimo: <span className="font-semibold">{mood} / 5</span></p>
          {hasDiscomfort && (
            <p className="text-amber-800 font-bold mt-1">
              • Molestia reportada: {zone} ({intensity}/10)
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-400 italic">
          * Tu información está disponible para el preparador físico y cuerpo técnico para adaptar las cargas del entrenamiento.
        </p>

        {isDemo && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-left text-xs text-amber-800">
              <span className="font-bold block">Aviso de modo demo:</span>
              <span>Esta fue una simulación en memoria. No se realizó ninguna llamada a Supabase ni se guardaron datos.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitResult({ status: 'idle' });
                setSleepQuality(0);
                setFatigue(0);
                setSoreness(0);
                setStress(0);
                setMood(0);
                setHasDiscomfort(false);
                setZone("");
                setIntensity(5);
                setNotes("");
                setValidationErrors({});
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Probar de nuevo el formulario</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Componente para renderizar cada pregunta Hooper de 1 a 5 derivando orientación y colores desde WELLNESS_CONFIG
  const renderHooperQuestion = (config: {
    questionId: 'sleepQuality' | 'fatigue' | 'soreness' | 'stress' | 'mood';
    subtitle: string;
    icon: any;
    value: number;
    setValue: (val: number) => void;
    errorKey: string;
  }) => {
    const { questionId, subtitle, icon: Icon, value, setValue, errorKey } = config;
    const qConfig = WELLNESS_CONFIG.questions.find((q) => q.id === questionId);
    if (!qConfig) return null;

    const hasError = Boolean(validationErrors[errorKey]);
    const isHigherBetter = qConfig.orientation === 'higher_is_better';

    return (
      <div 
        id={`question-${qConfig.id}`}
        className={`p-4 md:p-5 rounded-2xl border transition-all ${
          hasError 
            ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300' 
            : value > 0 
              ? 'bg-slate-50/80 border-slate-200' 
              : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${value > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{qConfig.title}</h3>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
          {value > 0 && (
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-sm">
              {value} / 5
            </span>
          )}
        </div>

        {/* 5 Botones táctiles grandes para móvil con color derivado de la orientación de la escala */}
        <div className="grid grid-cols-5 gap-2 my-3">
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = value === num;

            // Determinar color según orientación aprobada por Joaquín:
            // Si higher_is_better: 1-2 es rojo/alerta, 3 es ámbar, 4-5 es verde/óptimo (ej. Sueño, Ánimo)
            // Si higher_is_worse: 1-2 es verde/óptimo, 3 es ámbar, 4-5 es rojo/alerta (ej. Fatiga, Dolor, Estrés)
            let selectedColorClass = 'bg-blue-600 text-white';
            if (isHigherBetter) {
              if (num <= 2) selectedColorClass = 'bg-rose-600 text-white shadow-md transform scale-105';
              else if (num === 3) selectedColorClass = 'bg-amber-500 text-white shadow-md transform scale-105';
              else selectedColorClass = 'bg-emerald-600 text-white shadow-md transform scale-105';
            } else {
              if (num <= 2) selectedColorClass = 'bg-emerald-600 text-white shadow-md transform scale-105';
              else if (num === 3) selectedColorClass = 'bg-amber-500 text-white shadow-md transform scale-105';
              else selectedColorClass = 'bg-rose-600 text-white shadow-md transform scale-105';
            }

            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setValue(num);
                  if (validationErrors[errorKey]) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next[errorKey];
                      return next;
                    });
                  }
                }}
                className={`h-12 md:h-14 rounded-xl font-black text-lg md:text-xl transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? selectedColorClass
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <span>{num}</span>
              </button>
            );
          })}
        </div>

        {/* Etiquetas de los extremos según orientación configurada */}
        <div className="flex justify-between items-center text-[11px] font-bold px-1 text-gray-500">
          <span className={isHigherBetter ? 'text-rose-700' : 'text-emerald-700'}>
            1: {qConfig.endpoints.min.label}
          </span>
          <span className={isHigherBetter ? 'text-emerald-700' : 'text-rose-700'}>
            5: {qConfig.endpoints.max.label}
          </span>
        </div>

        {hasError && (
          <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {validationErrors[errorKey]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 font-sans">
      <Toaster position="top-center" />

      {/* HEADER VISUAL */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-6 text-white text-center relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-bold mb-2">
            <Activity className="w-3.5 h-3.5" /> Control Preventivo Diario
          </span>
          <h1 className="text-2xl font-black tracking-tight">{teamName}</h1>
          <p className="text-blue-100 text-xs mt-1">Cuestionario de Bienestar Pre-Entrenamiento</p>
          {eventDetails?.date && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-200 mt-2 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(parseISO(eventDetails.date), "EEEE d 'de' MMMM", { locale: es })}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
        
        {/* IDENTIFICACIÓN DEL JUGADOR */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
            1. Jugador / Identificación
          </label>
          {isLockedPlayer ? (
            <div className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-4 py-3 text-gray-900 font-bold flex items-center justify-between">
              <span>
                {players.find((p) => p.id === selectedPlayerId)?.first_name}{' '}
                {players.find((p) => p.id === selectedPlayerId)?.last_name || ''}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                Identificado
              </span>
            </div>
          ) : (
            <div>
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  if (validationErrors.player) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.player;
                      return next;
                    });
                  }
                }}
                className={`w-full border-2 rounded-2xl px-4 py-3 text-gray-900 font-semibold focus:ring-0 focus:border-blue-500 outline-none transition-colors ${
                  validationErrors.player ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                }`}
                required
              >
                <option value="">Selecciona tu nombre...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              {validationErrors.player && (
                <p className="text-xs text-red-600 font-bold mt-1.5">{validationErrors.player}</p>
              )}
            </div>
          )}
        </div>

        {/* 5 PREGUNTAS HOOPER (1 A 5 OBLIGATORIAS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider">
              2. Estado Físico y Mental Basal (1 a 5)
            </h2>
            <span className="text-[11px] font-bold text-gray-400">* Obligatorio</span>
          </div>

          {/* 1. Calidad del sueño */}
          {renderHooperQuestion({
            questionId: 'sleepQuality',
            subtitle: '¿Cómo has descansado esta noche?',
            icon: Moon,
            value: sleepQuality,
            setValue: setSleepQuality,
            errorKey: 'sleep',
          })}

          {/* 2. Fatiga percibida */}
          {renderHooperQuestion({
            questionId: 'fatigue',
            subtitle: '¿Cuánta energía o cansancio sientes ahora?',
            icon: BatteryCharging,
            value: fatigue,
            setValue: setFatigue,
            errorKey: 'fatigue',
          })}

          {/* 3. Dolor muscular / Agujetas */}
          {renderHooperQuestion({
            questionId: 'soreness',
            subtitle: '¿Sientes pesadez o rigidez en el cuerpo?',
            icon: Activity,
            value: soreness,
            setValue: setSoreness,
            errorKey: 'soreness',
          })}

          {/* 4. Estrés */}
          {renderHooperQuestion({
            questionId: 'stress',
            subtitle: '¿Sientes tensión, agobio o preocupaciones?',
            icon: Brain,
            value: stress,
            setValue: setStress,
            errorKey: 'stress',
          })}

          {/* 5. Estado de ánimo */}
          {renderHooperQuestion({
            questionId: 'mood',
            subtitle: '¿Con qué motivación vienes hoy a entrenar?',
            icon: Smile,
            value: mood,
            setValue: setMood,
            errorKey: 'mood',
          })}
        </div>

        {/* 3. REPORTE DE MOLESTIAS (CONDICIONAL) */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div>
            <label className="text-sm font-bold text-gray-800 block">
              3. ¿Tienes alguna molestia o dolor previo?
            </label>
            <p className="text-[11px] text-gray-500">Informa al preparador antes de saltar al campo</p>
          </div>

          {/* Dos opciones explícitas: "No, todo bien" y "Sí, tengo molestia" */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setHasDiscomfort(false);
                setZone("");
                setIntensity(5);
                setNotes("");
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next.zone;
                  delete next.intensity;
                  return next;
                });
              }}
              className={`py-3 px-3 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all border ${
                !hasDiscomfort
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm ring-2 ring-emerald-200/60'
                  : 'bg-white hover:bg-slate-50 border-gray-200 text-gray-600'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${!hasDiscomfort ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>No, todo bien</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHasDiscomfort(true);
              }}
              className={`py-3 px-3 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all border ${
                hasDiscomfort
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-white hover:bg-slate-50 border-gray-200 text-gray-600'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${hasDiscomfort ? 'text-white' : 'text-amber-500'}`} />
              <span>Sí, tengo molestia</span>
            </button>
          </div>

          {hasDiscomfort && (
            <div className="space-y-4 bg-amber-50/70 p-4 md:p-5 rounded-2xl border border-amber-200 animate-in fade-in duration-200">
              
              {/* Zona anatómica */}
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Zona corporal afectada <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aductor izquierdo, isquiotibial, tobillo derecho..."
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    if (validationErrors.zone) {
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next.zone;
                        return next;
                      });
                    }
                  }}
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-amber-500 ${
                    validationErrors.zone ? 'border-red-400 bg-red-50/50' : 'border-amber-200'
                  }`}
                  required
                />
                {validationErrors.zone && (
                  <p className="text-xs text-red-600 font-bold mt-1">{validationErrors.zone}</p>
                )}

                {/* Chips de selección rápida */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickZones.map((qz) => (
                    <button
                      key={qz}
                      type="button"
                      onClick={() => setZone(qz)}
                      className="text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      + {qz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensidad 1 a 10 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-amber-900">
                    Intensidad de la molestia:
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-600 text-white">
                    {intensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value) || 1)}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-amber-800/80 font-bold">
                  <span>1 (Leve / Notoria)</span>
                  <span>5 (Moderada)</span>
                  <span>10 (Muy aguda / Incapacitante)</span>
                </div>
              </div>

              {/* Observaciones (opcional) */}
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Observaciones adicionales (opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Noté un tirón en el partido anterior, sobrecarga tras golpe..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-start gap-2 bg-amber-100/70 p-2.5 rounded-xl text-[11px] text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  Control preventivo para el cuerpo técnico y preparador físico. No sustituye la valoración médica profesional.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN DE ENVÍO */}
        <button
          type="submit"
          disabled={submitting || !selectedPlayerId}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base md:text-lg py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isDemo ? "Validando en modo demo..." : "Registrando respuestas..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>{isDemo ? "Validar Cuestionario (Modo Demostración)" : "Enviar Cuestionario de Bienestar"}</span>
            </>
          )}
        </button>

        {submitResult.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No se pudo guardar:</p>
              <p className="mt-0.5">{submitResult.message}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
