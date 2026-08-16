'use client';

import React from 'react';
import { Calendar, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadTrafficLight, LoadBars } from './LoadTrafficLight';
import { MICROCYCLE_DAY_LABELS, DEFAULT_DAY_LOAD } from '@/types/microcycle';
import type { MicrocycleDay, FootballCategory } from '@/types/microcycle';

interface WeeklyMicrocycleViewProps {
  teamId: string;
  teamName: string;
  ageCategory: FootballCategory;
  sessions?: any[];
  onOpenAssistant: (day: MicrocycleDay) => void;
  className?: string;
}

const DAYS: MicrocycleDay[] = ['MD_plus_1', 'MD_minus_4', 'MD_minus_3', 'MD_minus_2', 'MD_minus_1', 'MD', 'REST'];

const DAY_COLORS: Record<MicrocycleDay, { bg: string; border: string; accent: string; textColor: string }> = {
  MD_plus_1:  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', textColor: '#15803d' },
  MD_minus_4: { bg: '#fef9c3', border: '#fde047', accent: '#f59e0b', textColor: '#92400e' },
  MD_minus_3: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', textColor: '#991b1b' },
  MD_minus_2: { bg: '#fff7ed', border: '#fed7aa', accent: '#f97316', textColor: '#9a3412' },
  MD_minus_1: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', textColor: '#1d4ed8' },
  MD:         { bg: '#f5f3ff', border: '#ddd6fe', accent: '#7c3aed', textColor: '#5b21b6' },
  REST:       { bg: '#f8fafc', border: '#e2e8f0', accent: '#94a3b8', textColor: '#64748b' },
};

const DAY_ICONS: Record<MicrocycleDay, string> = {
  MD_plus_1: '🛌', MD_minus_4: '💪', MD_minus_3: '⏳',
  MD_minus_2: '⚡', MD_minus_1: '🏃', MD: '⚽', REST: '💤',
};

const DAY_FOCUS: Record<MicrocycleDay, string> = {
  MD_plus_1:  'Recuperación activa, estiramientos y regeneración',
  MD_minus_4: 'Tensión neuromuscular, fuerza y duelos de intensidad',
  MD_minus_3: 'Duración y resistencia táctica, juegos largos',
  MD_minus_2: 'Velocidad y explosividad, sprints y transiciones rápidas',
  MD_minus_1: 'Activación ligera, repaso de patrones y frescura',
  MD:         'Partido oficial o amistoso',
  REST:       'Descanso completo del equipo',
};

export function WeeklyMicrocycleView({
  teamId, teamName, ageCategory, sessions = [], onOpenAssistant, className = ''
}: WeeklyMicrocycleViewProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header del microciclo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{teamName}</h2>
            <p className="text-sm text-slate-500 capitalize">{ageCategory} — Microciclo Semanal</p>
          </div>
        </div>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const colors = DAY_COLORS[day];
          const defaultLoad = DEFAULT_DAY_LOAD[day];
          const daySessions = sessions.filter(s => s.microcycle_day === day);
          const isRest = day === 'REST';

          return (
            <div
              key={day}
              className="rounded-xl border-2 p-3 flex flex-col gap-2 transition-shadow hover:shadow-md"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            >
              {/* Cabecera del día */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{DAY_ICONS[day]}</span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide" style={{ color: colors.accent }}>
                      {day === 'REST' ? 'REST' : day.replace('MD_', 'MD').replace('plus_', '+').replace('minus_', '-')}
                    </p>
                  </div>
                </div>
                {!isRest && (
                  <LoadBars level={defaultLoad as 1|2|3|4|5} />
                )}
              </div>

              {/* Nombre completo */}
              <p className="text-xs font-semibold" style={{ color: colors.textColor }}>
                {MICROCYCLE_DAY_LABELS[day]}
              </p>

              {/* Foco del día */}
              <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                {DAY_FOCUS[day]}
              </p>

              {/* Sesiones del día */}
              {daySessions.length > 0 && (
                <div className="space-y-1">
                  {daySessions.map((s: any) => (
                    <div key={s.id} className="bg-white/70 rounded-lg p-2 border border-white/50">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {s.duration_minutes}' — {s.intensity_load ? <LoadTrafficLight level={s.intensity_load} size="sm" showLabel={false} /> : null}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón añadir con IA */}
              {!isRest && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-auto text-xs gap-1 hover:bg-white/60"
                  style={{ color: colors.accent }}
                  onClick={() => onOpenAssistant(day)}
                >
                  <Plus className="w-3 h-3" />
                  <Zap className="w-3 h-3" />
                  IA
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyMicrocycleView;
