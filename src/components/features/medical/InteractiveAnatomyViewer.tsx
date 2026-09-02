'use client';

import React, { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';
import { PlayerInjuryDTO } from '@/app/actions/injury-actions';

export type CameraView = 'frontal' | 'posterior' | 'lateral_izq' | 'lateral_der';

interface InteractiveAnatomyViewerProps {
  selectedCode: string;
  onSelectZone: (code: string) => void;
  injuries: PlayerInjuryDTO[];
  onSelectInjury?: (injuryId: string) => void;
}

export function InteractiveAnatomyViewer({
  selectedCode,
  onSelectZone,
  injuries = [],
  onSelectInjury,
}: InteractiveAnatomyViewerProps) {
  const [cameraView, setCameraView] = useState<CameraView>('frontal');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  // Mapear qué zonas anatómicas tienen lesiones activas o antecedentes
  const injuryStatusByZone = useMemo(() => {
    const map: Record<string, { hasActive: boolean; hasResolved: boolean; injury?: PlayerInjuryDTO }> = {};

    injuries.forEach((inj) => {
      let code = '';
      const bs = (inj.bodyStructure || '').toLowerCase();
      const lat = (inj.laterality || '').toLowerCase();

      if (bs.includes('isquio') && lat.includes('derech')) code = 'isquiotibiales_der';
      else if (bs.includes('isquio') && lat.includes('izq')) code = 'isquiotibiales_izq';
      else if (bs.includes('recto') && lat.includes('derech')) code = 'recto_femoral_der';
      else if (bs.includes('recto') && lat.includes('izq')) code = 'recto_femoral_izq';
      else if (bs.includes('gemelo') && lat.includes('derech')) code = 'gastrocnemio_medial_der';
      else if (bs.includes('gemelo') && lat.includes('izq')) code = 'gastrocnemio_medial_izq';
      else if (bs.includes('soleo') && lat.includes('derech')) code = 'soleo_der';
      else if (bs.includes('soleo') && lat.includes('izq')) code = 'soleo_izq';
      else if (bs.includes('pubis')) code = 'pubis';
      else if (bs.includes('cruzado') || bs.includes('lca')) code = 'ligamento_cruzado_ant_der';
      else if (bs.includes('menisco')) code = 'menisco_interno_der';
      else if (bs.includes('metatarso') || bs.includes('jones')) code = 'metatarso_5to_der';

      if (code) {
        if (!map[code]) {
          map[code] = { hasActive: false, hasResolved: false };
        }
        if (inj.status === 'activa') {
          map[code].hasActive = true;
          map[code].injury = inj;
        } else {
          map[code].hasResolved = true;
          if (!map[code].injury) map[code].injury = inj;
        }
      }
    });

    return map;
  }, [injuries]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setCameraView('frontal');
  };

  return (
    <div className="relative w-full h-[520px] bg-gradient-to-b from-[#0b0f17] via-[#090d14] to-[#05070a] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between select-none shadow-2xl">
      {/* 1. Barra de Controles Superior: Selector de Vistas y Zoom */}
      <div className="flex items-center justify-between p-3.5 z-20 bg-[#0c1017]/80 backdrop-blur-md border-b border-slate-800/60">
        {/* Conmutador de 4 Vistas */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setCameraView('frontal')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cameraView === 'frontal'
                ? 'bg-emerald-950 border border-emerald-500/70 text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => setCameraView('posterior')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cameraView === 'posterior'
                ? 'bg-emerald-950 border border-emerald-500/70 text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Posterior
          </button>
          <button
            type="button"
            onClick={() => setCameraView('lateral_izq')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cameraView === 'lateral_izq'
                ? 'bg-emerald-950 border border-emerald-500/70 text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lateral Izq.
          </button>
          <button
            type="button"
            onClick={() => setCameraView('lateral_der')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cameraView === 'lateral_der'
                ? 'bg-emerald-950 border border-emerald-500/70 text-emerald-300 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lateral Der.
          </button>
        </div>

        {/* Controles de Zoom y Reseteo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Aumentar Zoom"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Disminuir Zoom"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Restablecer Vista"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 2. Leyenda Visual: Lesiones Activas (Rojo Pulsante) vs Antecedentes (Ámbar) */}
      <div className="absolute top-16 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#0b0f17]/90 border border-slate-800/80 rounded-xl px-2.5 py-2 shadow-lg flex flex-col gap-1.5 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-rose-500/40" />
            <span className="text-slate-300 font-semibold">Lesión Activa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-400 font-medium">Antecedente / Cicatriz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400 font-medium">Zona Seleccionada</span>
          </div>
        </div>
      </div>

      {/* 3. Escenario Central con Avatar Multicapa */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="relative transition-transform duration-150 ease-out flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* VISTA FRONTAL */}
          {cameraView === 'frontal' && (
            <div className="relative w-[210px] h-[440px] flex items-center justify-center">
              <img
                src={
                  injuryStatusByZone['recto_femoral_der']?.hasActive ||
                  selectedCode === 'recto_femoral_der' ||
                  selectedCode === 'isquiotibiales_der'
                    ? '/models/avatar_exact_mockup.png'
                    : '/models/avatar_front_reference_clean.png'
                }
                alt="Anatomía Frontal"
                className="w-full h-full object-contain filter contrast-105 pointer-events-none"
              />

              <svg
                viewBox="0 0 255 495"
                className="absolute inset-0 w-full h-full z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Cuádriceps / Recto Femoral Derecho */}
                <rect
                  x="128"
                  y="206"
                  width="38"
                  height="82"
                  rx="9"
                  onClick={() => onSelectZone('recto_femoral_der')}
                  onMouseEnter={() => setHoveredCode('recto_femoral_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'recto_femoral_der'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : injuryStatusByZone['recto_femoral_der']?.hasActive
                      ? 'fill-rose-600/50 stroke-rose-500 stroke-2 animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Recto femoral Derecho (Cuádriceps)</title>
                </rect>

                {/* Cuádriceps / Recto Femoral Izquierdo */}
                <rect
                  x="88"
                  y="206"
                  width="38"
                  height="82"
                  rx="9"
                  onClick={() => onSelectZone('recto_femoral_izq')}
                  onMouseEnter={() => setHoveredCode('recto_femoral_izq')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'recto_femoral_izq'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Recto femoral Izquierdo</title>
                </rect>

                {/* Pubis / Sínfisis Púbica */}
                <ellipse
                  cx="127"
                  cy="176"
                  rx="16"
                  ry="10"
                  onClick={() => onSelectZone('pubis')}
                  onMouseEnter={() => setHoveredCode('pubis')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'pubis'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : injuryStatusByZone['pubis']?.hasActive
                      ? 'fill-rose-600/50 stroke-rose-500 stroke-2 animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Pubis / Pubalgia</title>
                </ellipse>

                {/* Rodilla Derecha: LCA y Menisco Interno */}
                <circle
                  cx="105"
                  cy="295"
                  r="13"
                  onClick={() => onSelectZone('ligamento_cruzado_ant_der')}
                  onMouseEnter={() => setHoveredCode('ligamento_cruzado_ant_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'ligamento_cruzado_ant_der' || selectedCode === 'menisco_interno_der'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>LCA y Menisco Interno Rodilla Derecha</title>
                </circle>

                {/* Tobillo Derecho */}
                <circle
                  cx="105"
                  cy="400"
                  r="12"
                  onClick={() => onSelectZone('tobillo_der')}
                  onMouseEnter={() => setHoveredCode('tobillo_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className="fill-transparent cursor-pointer hover:fill-emerald-400/25"
                >
                  <title>Ligamento Tobillo Derecho</title>
                </circle>
              </svg>
            </div>
          )}

          {/* VISTA POSTERIOR */}
          {cameraView === 'posterior' && (
            <div className="relative w-[210px] h-[440px] flex items-center justify-center">
              <img
                src="/models/avatar_back_unlit.png"
                alt="Anatomía Posterior"
                className="w-full h-full object-contain filter contrast-105 pointer-events-none"
              />

              <svg
                viewBox="0 0 255 495"
                className="absolute inset-0 w-full h-full z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Isquiotibiales Derecho (LESIÓN HISTÓRICA ACTIVA EN BD) */}
                <rect
                  x="133"
                  y="214"
                  width="38"
                  height="82"
                  rx="9"
                  onClick={() => onSelectZone('isquiotibiales_der')}
                  onMouseEnter={() => setHoveredCode('isquiotibiales_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'isquiotibiales_der'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : injuryStatusByZone['isquiotibiales_der']?.hasActive
                      ? 'fill-rose-600/60 stroke-rose-400 stroke-2 animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Isquiotibiales Derecho</title>
                </rect>

                {/* Isquiotibiales Izquierdo */}
                <rect
                  x="84"
                  y="214"
                  width="38"
                  height="82"
                  rx="9"
                  onClick={() => onSelectZone('isquiotibiales_izq')}
                  onMouseEnter={() => setHoveredCode('isquiotibiales_izq')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'isquiotibiales_izq'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Isquiotibiales Izquierdo</title>
                </rect>

                {/* Gemelo Interno Derecho (LESIÓN HISTÓRICA ACTIVA EN BD) */}
                <path
                  d="M136,310 Q148,335 142,370 Q130,365 128,330 Z"
                  onClick={() => onSelectZone('gastrocnemio_medial_der')}
                  onMouseEnter={() => setHoveredCode('gastrocnemio_medial_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'gastrocnemio_medial_der'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : injuryStatusByZone['gastrocnemio_medial_der']?.hasActive
                      ? 'fill-rose-600/60 stroke-rose-400 stroke-2 animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Gemelo interno (Gastrocnemio medial) Derecho</title>
                </path>

                {/* Sóleo Derecho */}
                <path
                  d="M136,355 L144,385 L130,390 L126,365 Z"
                  onClick={() => onSelectZone('soleo_der')}
                  onMouseEnter={() => setHoveredCode('soleo_der')}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`cursor-pointer transition-all ${
                    selectedCode === 'soleo_der'
                      ? 'fill-emerald-500/40 stroke-emerald-400 stroke-2'
                      : 'fill-transparent hover:fill-emerald-400/25'
                  }`}
                >
                  <title>Sóleo Derecho</title>
                </path>
              </svg>
            </div>
          )}

          {/* VISTAS LATERALES */}
          {(cameraView === 'lateral_izq' || cameraView === 'lateral_der') && (
            <div className="relative w-[180px] h-[440px] flex items-center justify-center">
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <img
                  src={
                    cameraView === 'lateral_der'
                      ? '/models/avatar_exact_mockup.png'
                      : '/models/avatar_front_reference_clean.png'
                  }
                  alt={`Vista Lateral ${cameraView}`}
                  className="w-full h-80 object-contain filter contrast-125 opacity-70"
                />
                <span className="text-xs font-bold text-slate-300 mt-2">
                  Plano Sagital — {cameraView === 'lateral_der' ? 'Lateral Derecho' : 'Lateral Izquierdo'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Visualización de compartimentos lateral, iliotibial y peroneos
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Barra Inferior de Información de Hover */}
      <div className="px-4 py-2 bg-[#0c1017]/90 border-t border-slate-800/60 flex items-center justify-between text-xs z-20">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-slate-400 font-medium">Estructura inspeccionada:</span>
          <span className="font-bold text-white">
            {ANATOMICAL_ZONES[hoveredCode || selectedCode]?.name || 'Haz clic sobre una zona para examinar'}
          </span>
        </div>

        {injuryStatusByZone[hoveredCode || selectedCode]?.hasActive && (
          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
            <ShieldAlert size={14} />
            <span>Episodio Lesional Activo Registrado</span>
          </div>
        )}
      </div>
    </div>
  );
}
