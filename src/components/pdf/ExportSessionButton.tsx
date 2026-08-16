'use client';

import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedTrainingSession } from '@/types/exercises';
import { MICROCYCLE_DAY_LABELS } from '@/types/microcycle';
import type { MicrocycleDay } from '@/types/microcycle';

interface ExportSessionButtonProps {
  session: GeneratedTrainingSession;
  teamName?: string;
}

const PHASE_LABELS: Record<string, string> = {
  warmup: 'Calentamiento', main_1: 'Principal I', main_2: 'Principal II', cooldown: 'Vuelta a la Calma',
};

export function ExportSessionButton({ session, teamName }: ExportSessionButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${session.title} - Sporting Saladar</title>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #0f172a; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
          .header .meta { font-size: 13px; opacity: 0.8; display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
          .objectives { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
          .objectives h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #15803d; margin-bottom: 6px; }
          .objectives ul { padding-left: 18px; }
          .objectives li { font-size: 13px; color: #166534; margin-bottom: 2px; }
          .drills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .drill-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; break-inside: avoid; }
          .drill-header { padding: 10px 14px; font-weight: 700; font-size: 13px; }
          .warmup .drill-header { background: #fef9c3; color: #713f12; }
          .main_1 .drill-header { background: #dbeafe; color: #1e40af; }
          .main_2 .drill-header { background: #ede9fe; color: #5b21b6; }
          .cooldown .drill-header { background: #dcfce7; color: #15803d; }
          .drill-body { padding: 12px 14px; background: white; }
          .drill-body p { font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 8px; }
          .drill-meta { display: flex; gap: 10px; font-size: 11px; color: #64748b; flex-wrap: wrap; }
          .pill { background: #f1f5f9; padding: 2px 8px; border-radius: 999px; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 12px; } .drills-grid { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${session.title}</h1>
          <div class="meta">
            <span>Equipo: ${teamName || 'Equipo'}</span>
            <span>Categoría: ${session.ageCategory}</span>
            <span>Día: ${MICROCYCLE_DAY_LABELS[session.microcycleDay as MicrocycleDay] || session.microcycleDay}</span>
            <span>Duración: ${session.totalDuration} min</span>
            <span>Intensidad: ${session.intensityLoad}/5</span>
          </div>
        </div>
        ${session.objectives?.length ? `
        <div class="objectives">
          <h3>Objetivos de la Sesión</h3>
          <ul>${session.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
        </div>` : ''}
        <div class="drills-grid">
          ${session.drills.map((drill) => `
            <div class="drill-card ${drill.phase}">
              <div class="drill-header">
                ${PHASE_LABELS[drill.phase] || drill.phase} — ${drill.nombre}
              </div>
              <div class="drill-body">
                <p>${drill.descripcion}</p>
                <div class="drill-meta">
                  <span class="pill">⏱ ${drill.duration_min}' x${drill.sets}</span>
                  <span class="pill">👥 ${drill.players} jugadores</span>
                  <span class="pill">⚡ ${drill.intensity}/5</span>
                  ${drill.material.map(m => `<span class="pill">${m}</span>`).join('')}
                </div>
              </div>
            </div>`).join('')}
        </div>
        ${session.coachNotes ? `<div class="objectives" style="margin-top:16px"><h3>Notas del Entrenador</h3><p style="font-size:13px;color:#475569">${session.coachNotes}</p></div>` : ''}
        <div class="footer">
          Generado por Sistema de Gestión Sporting Saladar — ${new Date().toLocaleDateString('es-ES')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
      <Printer className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}

export default ExportSessionButton;
