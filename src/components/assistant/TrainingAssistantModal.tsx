'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Send, Loader2, Sparkles, Save, ChevronDown, ChevronUp,
  Brain, Calendar, Target, Shield, Zap, RefreshCw, CheckCircle2,
  Layers, Clock, Users, ArrowRight, BookOpen, Dumbbell, Compass, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { TacticalPitch } from '@/components/tactical/TacticalPitch';
import { LoadTrafficLight, LoadBars } from '@/components/microcycle/LoadTrafficLight';
import { ExportSessionButton } from '@/components/pdf/ExportSessionButton';
import { saveTrainingSessionAction } from '@/actions/saveTrainingSession';
import { MICROCYCLE_DAY_LABELS, CATEGORY_PEDAGOGY } from '@/types/microcycle';
import type { MicrocycleDay, FootballCategory } from '@/types/microcycle';
import type { GeneratedTrainingSession, GeneratedDrill } from '@/types/exercises';

interface TrainingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  ageCategory: FootballCategory;
  defaultMicrocycleDay?: MicrocycleDay;
  numPlayers?: number;
}

const PHASE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  warmup:   { label: '1. Calentamiento / Activación', color: '#92400e', bg: '#fef9c3', border: '#fde047' },
  main_1:   { label: '2. Fase Principal I (Introductoria)', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  main_2:   { label: '3. Fase Principal II (Situación Real)', color: '#5b21b6', bg: '#ede9fe', border: '#c4b5fd' },
  cooldown: { label: '4. Vuelta a la Calma / Feedback', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
};

function getPhaseConfig(phase?: string) {
  const normalized = (phase || '').toLowerCase().trim();
  if (normalized.includes('warm') || normalized.includes('calent') || normalized.includes('activ')) {
    return PHASE_CONFIG.warmup;
  }
  if (normalized.includes('cool') || normalized.includes('calma') || normalized.includes('estir') || normalized.includes('final')) {
    return PHASE_CONFIG.cooldown;
  }
  if (normalized.includes('2') || normalized.includes('ii') || normalized.includes('segund')) {
    return PHASE_CONFIG.main_2;
  }
  if (normalized.includes('1') || normalized.includes('i') || normalized.includes('primer') || normalized.includes('main') || normalized.includes('princ')) {
    return PHASE_CONFIG.main_1;
  }
  return PHASE_CONFIG[normalized] || { label: phase || 'Tarea', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' };
}

// Plantillas Metodológicas Rápidas por Categoría (UEFA Pro)
const METHODOLOGY_TEMPLATES: Record<string, { title: string; prompt: string; icon: string }[]> = {
  querubin: [
    { title: 'Juegos de Persecución y Esquivar', icon: '🏃', prompt: 'Sesión lúdica de psicomotricidad: 3 juegos de persecución con conos, mini-porterías y relevos divertidos.' },
    { title: 'El Castillo y los Ladrones', icon: '🏰', prompt: 'Juego lúdico de conducción libre y protección del balón con retos de mini-porterías.' },
  ],
  prebenjamin: [
    { title: 'Circuitos Motores y Duelos', icon: '⚽', prompt: 'Sesión de coordinación motriz, conducción en zig-zag y duelos 1v1 hacia mini-porterías.' },
    { title: 'Juego de los Pañuelos y Pase', icon: '🎯', prompt: 'Activación con juegos de habilidad, pases en parejas y partidillo 3v3 sin posiciones fijas.' },
  ],
  benjamin: [
    { title: 'Rondos 3v1 y Pase-Control', icon: '🔄', prompt: 'Sesión técnica: Rondos 3v1 en cuadrado, rueda de pases para control orientado y partido 4v4 con comodines.' },
    { title: 'Duelos 1v1 y 2v1 con Finalización', icon: '⚡', prompt: 'Sesión de técnica individual: Duelos ofensivos 1v1 y 2v1 con finalización rápida a portería.' },
  ],
  alevin: [
    { title: 'Juego de Posición 4v4 + 3 Comodines', icon: '🧩', prompt: 'Sesión de ocupación de espacios: Rondo 4v2, juego de posición 4v4+3 comodines y partido condicionado con 3 zonas.' },
    { title: 'Salida de Balón Básica (3-2)', icon: '🛡️', prompt: 'Sesión táctica: Automatismos de salida de balón ante presión con laterales abiertos y mediocentro de apoyo.' },
  ],
  infantil: [
    { title: 'Salida ante Presión y Tercer Hombre', icon: '⚽', prompt: 'Sesión táctica: Rueda de pases tercer hombre, rondo posicional 6v3 y juego de posición 7v7+1 con objetivo de superar la primera línea de presión.' },
    { title: 'Presión Tras Pérdida (Regla 3s)', icon: '🛡️', prompt: 'Sesión de transiciones: Juego de posesión con contrapresión inmediata tras pérdida de balón y contraataque rápido.' },
  ],
  cadete: [
    { title: 'Periodización Táctica: MD-3 Duración', icon: '⏳', prompt: 'Microciclo MD-3 (Duración): Rondo 5v2, juego de posición 8v8+2 en espacio amplio y partido táctico 11v11 con consignas de basculación y amplitud.' },
    { title: 'Periodización Táctica: MD-2 Velocidad', icon: '⚡', prompt: 'Microciclo MD-2 (Velocidad): Activación explosiva, transiciones rápidas 3v2 en oleadas continuas y finalización tras centros laterales.' },
  ],
  juvenil: [
    { title: 'Microciclo Estructurado: MD-4 Tensión', icon: '💪', prompt: 'Microciclo MD-4 (Tensión): Duelos de alta contracción 2v2 y 3v3 en espacio reducido, rondo de presión asfixiante y partidos cortos de máxima intensidad.' },
    { title: 'Salida de Balón vs Presión Alta 4-3-3', icon: '📐', prompt: 'Sesión táctica compleja: Automatismos de salida desde el portero con fijaciones de centrales, descensos del pivote y ataque a la espalda de la línea defensiva.' },
  ],
  senior: [
    { title: 'Modelo de Juego y Automatismos', icon: '🏆', prompt: 'Sesión de alto rendimiento: Rondo de atracción 6v4, juego condicionado 10v10 con zonas de finalización y ensayo de ABP (balón parado).' },
    { title: 'Microciclo MD-2: Velocidad y Transiciones', icon: '⚡', prompt: 'Microciclo MD-2: Tareas de máxima velocidad de ejecución, transiciones 4v3 vertiginosas y remates en llegada de segunda línea.' },
  ],
};

export function TrainingAssistantModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  ageCategory,
  defaultMicrocycleDay = 'MD_minus_3',
  numPlayers = 16,
}: TrainingAssistantModalProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<GeneratedTrainingSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDrills, setExpandedDrills] = useState<Set<number>>(new Set([0, 1, 2]));
  const [selectedDay, setSelectedDay] = useState<MicrocycleDay>(defaultMicrocycleDay);
  const [sessionDuration, setSessionDuration] = useState<number>(75);
  const [activeTab, setActiveTab] = useState<'assistant' | 'templates'>('assistant');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pedagogy = CATEGORY_PEDAGOGY[ageCategory] || CATEGORY_PEDAGOGY.senior;
  const currentTemplates = METHODOLOGY_TEMPLATES[ageCategory] || METHODOLOGY_TEMPLATES.senior;

  useEffect(() => {
    if (isOpen) {
      setSelectedDay(defaultMicrocycleDay || 'MD_minus_3');
      inputRef.current?.focus();
    }
  }, [isOpen, defaultMicrocycleDay]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleDrill = (index: number) => {
    setExpandedDrills((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleGenerateFromPrompt = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setGeneratedSession(null);

    let fullResponse = '';
    const assistantMessage = { role: 'assistant' as const, content: 'Diseñando sesión con rigor metodológico y pizarras tácticas...' };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch('/api/training-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          ageCategory,
          microcycleDay: selectedDay,
          teamId,
          numPlayers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.session) {
        throw new Error(data.error || `Error en el servidor (${response.status})`);
      }

      const session = data.session as GeneratedTrainingSession;
      setGeneratedSession(session);
      if (session.drills && Array.isArray(session.drills)) {
        setExpandedDrills(new Set(session.drills.map((_, i) => i)));
      }

      toast.success('🎯 ¡Sesión metodológica diseñada con éxito!');

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `✅ He diseñado la sesión "${session.title || 'Sesión de Entrenamiento'}" adaptada a la categoría ${ageCategory} y al microciclo ${selectedDay}. Puedes revisarla, ajustarla y exportarla a PDF en el panel derecho.`,
        };
        return updated;
      });
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar con el Asistente');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, ageCategory, selectedDay, teamId, numPlayers]);

  const handleSaveSession = async () => {
    if (!generatedSession) return;
    setIsSaving(true);

    try {
      const todayIso = new Date().toISOString();
      const res = await saveTrainingSessionAction({
        teamId,
        title: generatedSession.title || `Sesión ${selectedDay} - ${teamName}`,
        date: todayIso,
        ageCategory,
        microcycleDay: selectedDay,
        totalDuration: generatedSession.totalDuration || sessionDuration,
        intensityLoad: (generatedSession.intensityLoad as 1 | 2 | 3 | 4 | 5) || 3,
        coachNotes: generatedSession.coachNotes,
        objectives: generatedSession.objectives || [],
        drills: (generatedSession.drills as any) || [],
      });

      if (res.success) {
        toast.success('✅ ¡Sesión guardada en el Microciclo y Banco de Tareas!');
        onClose();
      } else {
        toast.error(res.error || 'Error al guardar la sesión');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh] animate-in zoom-in-95 duration-200">
        {/* ── HEADER PROFESIONAL UEFA PRO ──────────────────────────── */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base tracking-tight leading-tight">
                  Diseñador Metodológico de Sesiones con IA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                  UEFA PRO
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {teamName} • <span className="font-bold capitalize">{ageCategory}</span> ({pedagogy.ageRange})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {generatedSession && (
              <ExportSessionButton session={generatedSession} teamName={teamName} />
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BARRA DE CONTROL METODOLÓGICO (Microciclo y Foco) ────── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Selector de Día de Microciclo */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-700">Día de Microciclo:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as MicrocycleDay)}
              className="font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              {(Object.keys(MICROCYCLE_DAY_LABELS) as MicrocycleDay[]).map((dayKey) => (
                <option key={dayKey} value={dayKey}>
                  {MICROCYCLE_DAY_LABELS[dayKey]}
                </option>
              ))}
            </select>
          </div>

          {/* Foco pedagógico de la categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Foco:</span>
            {pedagogy.focus.slice(0, 3).map((f) => (
              <span key={f} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ── CONTENIDO PRINCIPAL (Panel Dividido: Chat/Plantillas vs Vista Sesión) ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* PANEL IZQUIERDO: Prompts y Metodología (40%) */}
          <div className="w-full md:w-[42%] border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Pestañas rápidas */}
            <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-1">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'assistant' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Asistente Táctico
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Plantillas Didácticas
              </button>
            </div>

            {/* Contenido Pestaña 1: Chat y Prompts */}
            {activeTab === 'assistant' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                {/* Sugerencias Rápidas de la Categoría */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    Propuestas Rápidas para {teamName}:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {currentTemplates.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => handleGenerateFromPrompt(tpl.prompt)}
                        disabled={isLoading}
                        className="p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group shadow-sm flex items-start gap-2.5"
                      >
                        <span className="text-lg">{tpl.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 group-hover:text-blue-700">{tpl.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{tpl.prompt}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Historial de conversación */}
                {messages.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-blue-600 text-white ml-6 font-medium rounded-tr-none'
                            : 'bg-white text-slate-800 mr-6 border border-slate-200/80 rounded-tl-none'
                        }`}
                      >
                        <p className="font-bold text-[10px] opacity-75 mb-0.5">
                          {m.role === 'user' ? 'Tú (Entrenador)' : 'Director Metodológico IA'}
                        </p>
                        <p>{m.role === 'user' ? m.content : 'Sesión generada y desglosada en el panel derecho.'}</p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            )}

            {/* Contenido Pestaña 2: Plantillas Didácticas */}
            {activeTab === 'templates' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  Selecciona una estructura metodológica oficial para cargarla en el planificador:
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'Salida de Balón y Progresión', focus: 'Tercer hombre, fijar centrales, amplitud', load: 3 },
                    { name: 'Presión Tras Pérdida y Contrapresión', focus: 'Regla de los 3 segundos, acoso coordinado', load: 4 },
                    { name: 'Finalización de Centros y 2ª Línea', focus: 'Desmarques en intervalo, remate 1 toque', load: 3 },
                    { name: 'Transición Ofensiva y Contraataque', focus: 'Pase vertical, desmarques de ruptura', load: 4 },
                    { name: 'Conservación en Espacio Reducido (Rondo)', focus: 'Circulación rápida a 2 toques', load: 3 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleGenerateFromPrompt(`Diseña una sesión completa de: ${item.name}. Foco: ${item.focus}`)}
                      className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900">{item.name}</h4>
                        <LoadBars level={item.load as 1 | 2 | 3 | 4 | 5} />
                      </div>
                      <p className="text-[11px] text-slate-500">{item.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input para escribir petición personalizada */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="relative flex items-center">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerateFromPrompt(inputValue);
                    }
                  }}
                  placeholder="Escribe tu objetivo táctico (ej: Rondo 4v2 y salida 3-2 ante presión)..."
                  disabled={isLoading}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateFromPrompt(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-sm"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: Previsualización de la Sesión y Pizarras SVG (58%) */}
          <div className="flex-1 flex flex-col bg-slate-100/70 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 animate-bounce">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Diseñando Sesión Metodológica...</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Calculando periodización, reglas de provocación y dibujando las pizarras tácticas SVG con conos y jugadores.
                  </p>
                </div>
              </div>
            ) : !generatedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-200/80 flex items-center justify-center text-slate-400">
                  <Compass className="w-8 h-8" />
                </div>
                <h3 className="font-black text-slate-800 text-base">Planificador de Sesiones Listo</h3>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Elige una de las propuestas metodológicas de la izquierda o describe tu objetivo táctico para que la IA diseñe las 4 fases de la sesión con sus pizarras interactivas.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Cabecera de la Sesión Generada */}
                <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight">
                      {generatedSession.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                        {MICROCYCLE_DAY_LABELS[selectedDay]}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {generatedSession.totalDuration || sessionDuration} min
                      </span>
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {numPlayers} jugadores
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveSession}
                      disabled={isSaving}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar Sesión en Microciclo
                    </Button>
                  </div>
                </div>

                {/* Lista de Fases y Tareas de la Sesión */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {/* Objetivos Principales */}
                  {generatedSession.objectives && generatedSession.objectives.length > 0 && (
                    <div className="p-3 bg-white rounded-2xl border border-blue-100 space-y-1.5 shadow-sm">
                      <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Objetivos Didácticos de la Sesión:
                      </p>
                      <ul className="text-xs text-slate-700 space-y-1 font-medium pl-1">
                        {generatedSession.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notas del Entrenador */}
                  {generatedSession.coachNotes && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold">Consigna Clave del Entrenador: </span>
                      {generatedSession.coachNotes}
                    </div>
                  )}

                  {/* Fases / Drills Desglosados */}
                  <div className="space-y-3">
                    {generatedSession.drills.map((drill, idx) => {
                      const phaseCfg = getPhaseConfig(drill.phase);
                      const isExpanded = expandedDrills.has(idx);

                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all"
                        >
                          {/* Cabecera del Drill */}
                          <div
                            onClick={() => toggleDrill(idx)}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap"
                                style={{ backgroundColor: phaseCfg.bg, color: phaseCfg.color }}
                              >
                                {phaseCfg.label}
                              </span>
                              <h4 className="font-black text-slate-900 text-xs truncate">{drill.nombre}</h4>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-slate-500 font-semibold">⏱ {drill.duration_min || 15} min</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* Cuerpo expandible con Pizarra SVG y Detalles */}
                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                              {/* Pizarra Táctica SVG Interactiva */}
                              {drill.tactical_board_data && (
                                <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                      Pizarra Táctica SVG
                                    </span>
                                    {drill.tactical_board_data.description && (
                                      <span className="text-[11px] text-slate-500 italic max-w-xs truncate">
                                        {drill.tactical_board_data.description}
                                      </span>
                                    )}
                                  </div>
                                  <TacticalPitch data={drill.tactical_board_data} className="rounded-xl shadow-inner" />
                                </div>
                              )}

                              {/* Descripción didáctica */}
                              <div className="space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Funcionamiento y Reglas:</p>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">{drill.descripcion}</p>
                              </div>

                              {/* Materiales y Variantes */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                                {drill.material && drill.material.length > 0 && (
                                  <div>
                                    <span className="font-bold text-slate-600">Material Necesario: </span>
                                    <span className="text-slate-500">{drill.material.join(', ')}</span>
                                  </div>
                                )}
                                {drill.variantes && drill.variantes.length > 0 && (
                                  <div>
                                    <span className="font-bold text-slate-600">Variantes Didácticas: </span>
                                    <span className="text-slate-500">{drill.variantes.join(' • ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingAssistantModal;
