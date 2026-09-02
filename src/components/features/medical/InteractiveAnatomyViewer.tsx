'use client';

import React, { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  Layers,
  ChevronRight,
  Target,
  Crosshair,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  ANATOMICAL_ZONES,
  AnatomicalZone,
  getSubportionsForStructure,
  TissueSubportion,
} from '@/hooks/useAnatomySelection';
import { PlayerInjuryDTO } from '@/app/actions/injury-actions';

export type CameraView = 'frontal' | 'posterior' | 'lateral_izq' | 'lateral_der';

interface InteractiveAnatomyViewerProps {
  selectedCode: string;
  onSelectZone: (code: string, subportionCode?: string) => void;
  injuries: PlayerInjuryDTO[];
  selectedSubportion?: string;
  onSelectSubportion?: (subportionCode: string) => void;
  onSelectInjury?: (injuryId: string) => void;
}

export function InteractiveAnatomyViewer({
  selectedCode,
  onSelectZone,
  injuries = [],
  selectedSubportion = 'union_miotendinosa',
  onSelectSubportion,
  onSelectInjury,
}: InteractiveAnatomyViewerProps) {
  const [cameraView, setCameraView] = useState<CameraView>('posterior');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hoveredSubportion, setHoveredSubportion] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<'macro' | 'micro'>('macro');

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

  const currentZone: AnatomicalZone = ANATOMICAL_ZONES[selectedCode] || ANATOMICAL_ZONES['isquiotibiales_der'];
  const availableSubportions = useMemo(() => {
    return getSubportionsForStructure(selectedCode, currentZone?.name);
  }, [selectedCode, currentZone?.name]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setZoomMode('macro');
  };

  const handleSelectZoneMacro = (code: string) => {
    onSelectZone(code);
    // Cambiar automáticamente la cámara según la vista por defecto de la zona
    const zone = ANATOMICAL_ZONES[code];
    if (zone?.viewDefault) {
      setCameraView(zone.viewDefault === 'frontal' ? 'frontal' : 'posterior');
    }
    // Entrar en modo micro de precisión
    setZoomMode('micro');
  };

  const handleSelectSubportionClick = (subCode: string) => {
    onSelectSubportion?.(subCode);
    onSelectZone(selectedCode, subCode);
  };

  return (
    <div className="relative w-full h-[540px] bg-gradient-to-b from-[#0b0f17] via-[#090d14] to-[#05070a] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between select-none shadow-2xl">
      {/* 1. Barra de Controles Superior: Selector de Vistas y Zoom */}
      <div className="flex items-center justify-between p-3 z-20 bg-[#0c1017]/90 backdrop-blur-md border-b border-slate-800/70">
        {/* Conmutador de 4 Vistas */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
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
            Lat. Izq
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
            Lat. Der
          </button>
        </div>

        {/* Conmutador de Modo Macro / Micro y Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setZoomMode('macro')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                zoomMode === 'macro'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cuerpo Entero
            </button>
            <button
              type="button"
              onClick={() => setZoomMode('micro')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                zoomMode === 'micro'
                  ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target size={12} className="text-emerald-400" />
              <span>Zoom Quirúrgico</span>
            </button>
          </div>

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
      </div>

      {/* 2. Barra de Migas de Pan (Navegación Jerárquica Macro a Micro) */}
      <div className="px-4 py-2 bg-[#080c14]/95 border-b border-slate-800/60 flex items-center justify-between text-xs z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-medium">
          <button
            type="button"
            onClick={() => {
              setZoomMode('macro');
            }}
            className="text-slate-400 hover:text-white cursor-pointer transition-colors flex items-center gap-1"
          >
            <span>Cuerpo Completo</span>
          </button>
          <ChevronRight size={12} className="text-slate-600 shrink-0" />

          <span className="text-slate-400 shrink-0">
            {currentZone?.generalRegion || 'Miembro Inferior'}
          </span>
          <ChevronRight size={12} className="text-slate-600 shrink-0" />

          <button
            type="button"
            onClick={() => setZoomMode('micro')}
            className="text-emerald-400 font-bold shrink-0 hover:underline cursor-pointer"
          >
            {currentZone?.name || 'Isquiotibiales Derecho'}
          </button>

          {zoomMode === 'micro' && (
            <>
              <ChevronRight size={12} className="text-slate-600 shrink-0" />
              <span className="text-emerald-300 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 text-[11px] shrink-0 font-mono">
                {availableSubportions.find((s) => s.code === selectedSubportion)?.shortLabel || 'Unión Miotendinosa'}
              </span>
            </>
          )}
        </div>

        {zoomMode === 'micro' && (
          <button
            type="button"
            onClick={() => setZoomMode('macro')}
            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer transition-colors shrink-0"
          >
            <ArrowLeft size={12} />
            <span>Volver a Vista Completa</span>
          </button>
        )}
      </div>

      {/* 3. Escenario Central con Avatar Multicapa o Zoom Micro Quirúrgico */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* =========================================================================
            MODO MICRO: VISTA DE ALTA RESOLUCIÓN Y PRECISIÓN DE TEJIDO
            ========================================================================= */}
        {zoomMode === 'micro' ? (
          <div className="relative w-full h-full max-w-lg flex flex-col items-center justify-center p-4 z-10 animate-fade-in">
            {/* Tarjeta de Guía Anatómica Flotante */}
            <div className="absolute top-2 left-4 z-20 flex flex-col gap-1 pointer-events-none">
              <span className="text-[10px] font-bold font-mono uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                <Crosshair size={12} />
                Enfoque Anatómico de Alta Resolución
              </span>
              <h4 className="text-base font-black text-white">{currentZone?.name}</h4>
              <p className="text-[11px] text-slate-400 max-w-xs leading-tight">
                Selecciona la porción exacta afectada por tracción, rotura o entesopatía.
              </p>
            </div>

            {/* Diagrama Anatómico Micro Vectorial con 4 Porciones */}
            <div className="relative w-[300px] h-[340px] bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 flex items-center justify-center shadow-inner">
              <svg
                viewBox="0 0 260 320"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Fondo de Referencia Ósea y Silueta de Músculo */}
                <defs>
                  <linearGradient id="muscleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
                    <stop offset="25%" stopColor="#dc2626" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="85%" stopColor="#dc2626" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#334155" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="activeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Hueso proximal / Isquion o Fémur */}
                <path
                  d="M100,20 Q130,10 160,20 Q170,35 155,45 Q130,40 105,45 Z"
                  className="fill-slate-800/90 stroke-slate-700 stroke-1"
                />
                <text x="130" y="28" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase">
                  Inserción de Origen
                </text>

                {/* Hueso distal / Tibia / Peroné */}
                <path
                  d="M105,275 Q130,280 155,275 Q165,295 150,305 Q130,300 110,305 Z"
                  className="fill-slate-800/90 stroke-slate-700 stroke-1"
                />
                <text x="130" y="298" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase">
                  Inserción Distal
                </text>

                {/* =========================================================================
                    LAS 4 PORCIONES CLÍNICAS INTERACTIVAS
                    ========================================================================= */}

                {/* 1. TERCIO PROXIMAL */}
                <g
                  onClick={() => handleSelectSubportionClick('tercio_proximal')}
                  onMouseEnter={() => setHoveredSubportion('tercio_proximal')}
                  onMouseLeave={() => setHoveredSubportion(null)}
                  className="cursor-pointer transition-all"
                >
                  <path
                    d="M105,45 L155,45 L165,95 L95,95 Z"
                    className={`transition-all ${
                      selectedSubportion === 'tercio_proximal'
                        ? 'fill-emerald-500/50 stroke-emerald-400 stroke-2'
                        : 'fill-slate-800/60 hover:fill-emerald-400/25 stroke-slate-700/60 stroke-1'
                    }`}
                  />
                  <line x1="165" y1="70" x2="205" y2="70" className="stroke-slate-600 stroke-1 stroke-dasharray-2" />
                  <text x="210" y="74" className="text-[10px] fill-slate-300 font-bold">
                    Tercio Proximal
                  </text>
                  <text x="210" y="86" className="text-[8px] fill-slate-500 font-mono">
                    M4 (Avulsión / Entesis)
                  </text>
                </g>

                {/* 2. UNIÓN MIOTENDINOSA (UMT) - Zona de Máxima Incidencia */}
                <g
                  onClick={() => handleSelectSubportionClick('union_miotendinosa')}
                  onMouseEnter={() => setHoveredSubportion('union_miotendinosa')}
                  onMouseLeave={() => setHoveredSubportion(null)}
                  className="cursor-pointer transition-all"
                >
                  <path
                    d="M95,95 L165,95 L175,150 L85,150 Z"
                    className={`transition-all ${
                      selectedSubportion === 'union_miotendinosa'
                        ? 'fill-emerald-500/50 stroke-emerald-400 stroke-2'
                        : injuryStatusByZone[selectedCode]?.hasActive
                        ? 'fill-rose-600/50 stroke-rose-400 stroke-2 animate-pulse'
                        : 'fill-slate-800/70 hover:fill-emerald-400/25 stroke-slate-700/60 stroke-1'
                    }`}
                  />
                  <line x1="175" y1="122" x2="205" y2="122" className="stroke-slate-600 stroke-1" />
                  <text x="210" y="122" className="text-[10px] fill-emerald-400 font-bold">
                    Unión Miotendinosa ★
                  </text>
                  <text x="210" y="134" className="text-[8px] fill-slate-400 font-mono">
                    M3B (Rotura Fascicular)
                  </text>
                </g>

                {/* 3. VIENTRE MUSCULAR CENTRAL */}
                <g
                  onClick={() => handleSelectSubportionClick('vientre_muscular')}
                  onMouseEnter={() => setHoveredSubportion('vientre_muscular')}
                  onMouseLeave={() => setHoveredSubportion(null)}
                  className="cursor-pointer transition-all"
                >
                  <path
                    d="M85,150 L175,150 L168,210 L92,210 Z"
                    className={`transition-all ${
                      selectedSubportion === 'vientre_muscular'
                        ? 'fill-emerald-500/50 stroke-emerald-400 stroke-2'
                        : 'fill-slate-800/60 hover:fill-emerald-400/25 stroke-slate-700/60 stroke-1'
                    }`}
                  />
                  <line x1="172" y1="180" x2="205" y2="180" className="stroke-slate-600 stroke-1" />
                  <text x="210" y="180" className="text-[10px] fill-slate-300 font-bold">
                    Vientre Muscular
                  </text>
                  <text x="210" y="192" className="text-[8px] fill-slate-500 font-mono">
                    M3A (Miofascial)
                  </text>
                </g>

                {/* 4. TERCIO DISTAL */}
                <g
                  onClick={() => handleSelectSubportionClick('tercio_distal')}
                  onMouseEnter={() => setHoveredSubportion('tercio_distal')}
                  onMouseLeave={() => setHoveredSubportion(null)}
                  className="cursor-pointer transition-all"
                >
                  <path
                    d="M92,210 L168,210 L155,275 L105,275 Z"
                    className={`transition-all ${
                      selectedSubportion === 'tercio_distal'
                        ? 'fill-emerald-500/50 stroke-emerald-400 stroke-2'
                        : 'fill-slate-800/60 hover:fill-emerald-400/25 stroke-slate-700/60 stroke-1'
                    }`}
                  />
                  <line x1="162" y1="242" x2="205" y2="242" className="stroke-slate-600 stroke-1 stroke-dasharray-2" />
                  <text x="210" y="242" className="text-[10px] fill-slate-300 font-bold">
                    Tercio Distal
                  </text>
                  <text x="210" y="254" className="text-[8px] fill-slate-500 font-mono">
                    M3B / Tendón Libre
                  </text>
                </g>

                {/* Pin de Diana Pulsante en la Porción Activa */}
                {selectedSubportion && (
                  <g
                    transform={`translate(130, ${
                      selectedSubportion === 'tercio_proximal'
                        ? 70
                        : selectedSubportion === 'union_miotendinosa'
                        ? 122
                        : selectedSubportion === 'vientre_muscular'
                        ? 180
                        : 242
                    })`}
                    className="pointer-events-none"
                  >
                    <circle r="14" className="fill-emerald-500/30 stroke-emerald-400 stroke-1 animate-ping" />
                    <circle r="7" className="fill-emerald-500 stroke-white stroke-2 shadow-lg" />
                    <circle r="2" className="fill-black" />
                  </g>
                )}
              </svg>
            </div>
          </div>
        ) : (
          /* =========================================================================
              MODO MACRO: VISOR COMPLETO DEL CUERPO HUMANO
              ========================================================================= */
          <div
            className="relative transition-transform duration-200 ease-out flex items-center justify-center"
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
                    onClick={() => handleSelectZoneMacro('recto_femoral_der')}
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
                    <title>Recto femoral Derecho (Haz clic para zoom micro)</title>
                  </rect>

                  {/* Cuádriceps / Recto Femoral Izquierdo */}
                  <rect
                    x="88"
                    y="206"
                    width="38"
                    height="82"
                    rx="9"
                    onClick={() => handleSelectZoneMacro('recto_femoral_izq')}
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
                    onClick={() => handleSelectZoneMacro('pubis')}
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
                    onClick={() => handleSelectZoneMacro('ligamento_cruzado_ant_der')}
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
                    onClick={() => handleSelectZoneMacro('tobillo_der')}
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
                    onClick={() => handleSelectZoneMacro('isquiotibiales_der')}
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
                    <title>Isquiotibiales Derecho (Haz clic para zoom micro)</title>
                  </rect>

                  {/* Isquiotibiales Izquierdo */}
                  <rect
                    x="84"
                    y="214"
                    width="38"
                    height="82"
                    rx="9"
                    onClick={() => handleSelectZoneMacro('isquiotibiales_izq')}
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
                    onClick={() => handleSelectZoneMacro('gastrocnemio_medial_der')}
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
                    onClick={() => handleSelectZoneMacro('soleo_der')}
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
        )}
      </div>

      {/* 4. Barra Inferior de Información y Estado */}
      <div className="px-4 py-2 bg-[#0c1017]/95 border-t border-slate-800/60 flex items-center justify-between text-xs z-20">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-slate-400 font-medium">Estructura activa:</span>
          <span className="font-bold text-white">
            {ANATOMICAL_ZONES[hoveredCode || selectedCode]?.name || 'Haz clic sobre una zona para examinar'}
          </span>
          {zoomMode === 'micro' && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/70 font-mono font-bold">
              Porción: {availableSubportions.find((s) => s.code === (hoveredSubportion || selectedSubportion))?.shortLabel || 'UMT'}
            </span>
          )}
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
