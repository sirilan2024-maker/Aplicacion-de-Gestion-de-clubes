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
  Activity,
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
  selectedCode?: string | null;
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
  const [cameraView, setCameraView] = useState<CameraView>('frontal');
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

      // Mapeo detallado de estructuras
      if (bs.includes('biceps femoral') && bs.includes('corta')) {
        code = lat.includes('izq') ? 'biceps_femoral_corta_izq' : 'biceps_femoral_corta_der';
      } else if (bs.includes('biceps femoral') || (bs.includes('isquio') && bs.includes('larga'))) {
        code = lat.includes('izq') ? 'biceps_femoral_larga_izq' : 'biceps_femoral_larga_der';
      } else if (bs.includes('semitendinoso')) {
        code = lat.includes('izq') ? 'semitendinoso_izq' : 'semitendinoso_der';
      } else if (bs.includes('semimembranoso')) {
        code = lat.includes('izq') ? 'semimembranoso_izq' : 'semimembranoso_der';
      } else if (bs.includes('isquio')) {
        code = lat.includes('izq') ? 'isquiotibiales_izq' : 'isquiotibiales_der';
      } else if (bs.includes('vasto lateral')) {
        code = lat.includes('izq') ? 'vasto_lateral_izq' : 'vasto_lateral_der';
      } else if (bs.includes('vasto medial')) {
        code = lat.includes('izq') ? 'vasto_medial_izq' : 'vasto_medial_der';
      } else if (bs.includes('sartorio')) {
        code = lat.includes('izq') ? 'sartorio_izq' : 'sartorio_der';
      } else if (bs.includes('recto') && (bs.includes('femoral') || bs.includes('anterior'))) {
        code = lat.includes('izq') ? 'recto_femoral_izq' : 'recto_femoral_der';
      } else if (bs.includes('aductor mayor')) {
        code = lat.includes('izq') ? 'aductor_mayor_izq' : 'aductor_mayor_der';
      } else if (bs.includes('aductor') || bs.includes('pubalgia')) {
        code = lat.includes('izq') ? 'aductor_largo_izq' : 'aductor_largo_der';
      } else if (bs.includes('pectineo')) {
        code = lat.includes('izq') ? 'pectineo_izq' : 'pectineo_der';
      } else if (bs.includes('gracil') || bs.includes('recto interno')) {
        code = lat.includes('izq') ? 'gracil_izq' : 'gracil_der';
      } else if (bs.includes('psoas')) {
        code = lat.includes('izq') ? 'psoas_iliaco_izq' : 'psoas_iliaco_der';
      } else if (bs.includes('tensor') || bs.includes('fascia lata')) {
        code = lat.includes('izq') ? 'tensor_fascia_lata_izq' : 'tensor_fascia_lata_der';
      } else if (bs.includes('gemelo interno') || bs.includes('medial')) {
        code = lat.includes('izq') ? 'gastrocnemio_medial_izq' : 'gastrocnemio_medial_der';
      } else if (bs.includes('gemelo externo') || bs.includes('lateral')) {
        code = lat.includes('izq') ? 'gastrocnemio_lateral_izq' : 'gastrocnemio_lateral_der';
      } else if (bs.includes('soleo')) {
        code = lat.includes('izq') ? 'soleo_izq' : 'soleo_der';
      } else if (bs.includes('tibial')) {
        code = lat.includes('izq') ? 'tibial_anterior_izq' : 'tibial_anterior_der';
      } else if (bs.includes('peroneo')) {
        code = lat.includes('izq') ? 'peroneo_lateral_izq' : 'peroneo_lateral_der';
      } else if (bs.includes('recto abdominal') || bs.includes('core')) {
        code = 'recto_abdominal';
      } else if (bs.includes('oblicuo')) {
        code = lat.includes('izq') ? 'oblicuo_abdomen_izq' : 'oblicuo_abdomen_der';
      } else if (bs.includes('erector') || bs.includes('lumbar')) {
        code = 'erectores_columna';
      } else if (bs.includes('supraespinoso')) {
        code = lat.includes('izq') ? 'supraespinoso_izq' : 'supraespinoso_der';
      } else if (bs.includes('subescapular') || bs.includes('redondo')) {
        code = lat.includes('izq') ? 'subescapular_izq' : 'subescapular_der';
      } else if (bs.includes('dorsal')) {
        code = lat.includes('izq') ? 'dorsal_ancho_izq' : 'dorsal_ancho_der';
      } else if (bs.includes('pectoral')) {
        code = lat.includes('izq') ? 'pectoral_mayor_izq' : 'pectoral_mayor_der';
      } else if (bs.includes('pubis')) {
        code = 'pubis';
      } else if (bs.includes('cruzado') || bs.includes('lca')) {
        code = 'ligamento_cruzado_ant_der';
      } else if (bs.includes('menisco')) {
        code = 'menisco_interno_der';
      }

      if (code) {
        if (!map[code]) map[code] = { hasActive: false, hasResolved: false };
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

  const currentZone: AnatomicalZone | null = selectedCode ? (ANATOMICAL_ZONES[selectedCode] || null) : null;
  const availableSubportions = useMemo(() => {
    return getSubportionsForStructure(selectedCode || undefined, currentZone?.name);
  }, [selectedCode, currentZone?.name]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setZoomMode('macro');
  };

  const handleSelectZoneMacro = (code: string) => {
    onSelectZone(code);
    const zone = ANATOMICAL_ZONES[code];
    if (zone?.viewDefault) {
      setCameraView(zone.viewDefault === 'frontal' ? 'frontal' : 'posterior');
    }
    setZoomMode('micro');
  };

  const handleSelectSubportionClick = (subCode: string) => {
    onSelectSubportion?.(subCode);
    if (selectedCode) {
      onSelectZone(selectedCode, subCode);
    }
  };

  // Helper visual para estilos de cada elemento vectorial
  const getShapeClasses = (code: string) => {
    const isSelected = selectedCode === code;
    const hasActive = injuryStatusByZone[code]?.hasActive;
    if (isSelected) {
      return 'fill-emerald-500/50 stroke-emerald-400 stroke-2 cursor-pointer shadow-lg';
    }
    if (hasActive) {
      return 'fill-rose-600/60 stroke-rose-400 stroke-2 animate-pulse cursor-pointer';
    }
    return 'fill-transparent hover:fill-emerald-400/30 stroke-slate-500/30 hover:stroke-emerald-400/80 stroke-1 cursor-pointer transition-all';
  };

  return (
    <div className="relative w-full h-[540px] bg-gradient-to-b from-[#0b0f17] via-[#090d14] to-[#05070a] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between select-none shadow-2xl">
      {/* 1. Barra de Controles Superior: Selector de Vistas y Zoom */}
      <div className="flex items-center justify-between p-3 z-20 bg-[#0c1017]/90 backdrop-blur-md border-b border-slate-800/70">
        {/* Conmutador de Vistas */}
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
            onClick={() => setZoomMode('macro')}
            className={`cursor-pointer transition-colors flex items-center gap-1 ${
              !currentZone ? 'text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Cuerpo Completo</span>
          </button>

          {currentZone ? (
            <>
              <ChevronRight size={12} className="text-slate-600 shrink-0" />
              <span className="text-slate-400 shrink-0">{currentZone.generalRegion}</span>
              <ChevronRight size={12} className="text-slate-600 shrink-0" />
              <button
                type="button"
                onClick={() => setZoomMode('micro')}
                className="text-emerald-400 font-bold shrink-0 hover:underline cursor-pointer"
              >
                {currentZone.name}
              </button>
              {zoomMode === 'micro' && (
                <>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="text-emerald-300 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 text-[11px] shrink-0 font-mono">
                    {availableSubportions.find((s) => s.code === selectedSubportion)?.shortLabel || 'Unión Miotendinosa'}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <ChevronRight size={12} className="text-slate-700 shrink-0" />
              <span className="text-slate-500 text-[11px] font-normal italic">
                Selecciona una zona en el cuerpo para examinarla
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
              <h4 className="text-base font-black text-white">{currentZone?.name || 'Estructura seleccionada'}</h4>
              <p className="text-[11px] text-slate-400 max-w-xs leading-tight">
                {currentZone?.mecanismoComun || 'Selecciona la porción exacta afectada por tracción, rotura o entesopatía.'}
              </p>
            </div>

            {/* Diagrama Anatómico Micro Vectorial con 4 Porciones */}
            <div className="relative w-[300px] h-[340px] bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 260 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Fondo de Referencia Ósea */}
                <path
                  d="M100,20 Q130,10 160,20 Q170,35 155,45 Q130,40 105,45 Z"
                  className="fill-slate-800/90 stroke-slate-700 stroke-1"
                />
                <text x="130" y="28" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase">
                  Inserción de Origen
                </text>

                <path
                  d="M105,275 Q130,280 155,275 Q165,295 150,305 Q130,300 110,305 Z"
                  className="fill-slate-800/90 stroke-slate-700 stroke-1"
                />
                <text x="130" y="298" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase">
                  Inserción Distal
                </text>

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

                {/* 2. UNIÓN MIOTENDINOSA (UMT) */}
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
                        : selectedCode && injuryStatusByZone[selectedCode]?.hasActive
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
                    injuryStatusByZone['recto_femoral_der']?.hasActive || selectedCode === 'recto_femoral_der'
                      ? '/models/avatar_exact_mockup.png'
                      : '/models/avatar_front_reference_clean.png'
                  }
                  alt="Anatomía Frontal"
                  className="w-full h-full object-contain filter contrast-105 pointer-events-none"
                />

                <svg viewBox="0 0 255 495" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="xMidYMid meet">
                  {/* --- TREN SUPERIOR / PORTERO (FRONTAL) --- */}
                  {/* Supraespinoso / Hombro Izquierdo y Derecho */}
                  <circle
                    cx="70"
                    cy="115"
                    r="12"
                    onClick={() => handleSelectZoneMacro('supraespinoso_izq')}
                    onMouseEnter={() => setHoveredCode('supraespinoso_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('supraespinoso_izq')}
                  >
                    <title>Supraespinoso Izquierdo (Manguito rotador / Portero)</title>
                  </circle>
                  <circle
                    cx="185"
                    cy="115"
                    r="12"
                    onClick={() => handleSelectZoneMacro('supraespinoso_der')}
                    onMouseEnter={() => setHoveredCode('supraespinoso_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('supraespinoso_der')}
                  >
                    <title>Supraespinoso Derecho (Manguito rotador / Portero)</title>
                  </circle>

                  {/* Pectoral Mayor Izquierdo y Derecho */}
                  <rect
                    x="94"
                    y="125"
                    width="28"
                    height="22"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('pectoral_mayor_izq')}
                    onMouseEnter={() => setHoveredCode('pectoral_mayor_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('pectoral_mayor_izq')}
                  >
                    <title>Pectoral mayor Izquierdo (Bloqueos y caídas portero)</title>
                  </rect>
                  <rect
                    x="133"
                    y="125"
                    width="28"
                    height="22"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('pectoral_mayor_der')}
                    onMouseEnter={() => setHoveredCode('pectoral_mayor_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('pectoral_mayor_der')}
                  >
                    <title>Pectoral mayor Derecho (Bloqueos y caídas portero)</title>
                  </rect>

                  {/* --- CORE Y TRONCO (FRONTAL) --- */}
                  {/* Recto Abdominal */}
                  <rect
                    x="113"
                    y="152"
                    width="29"
                    height="40"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('recto_abdominal')}
                    onMouseEnter={() => setHoveredCode('recto_abdominal')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('recto_abdominal')}
                  >
                    <title>Recto abdominal (Core - Saques de banda y giros en el aire)</title>
                  </rect>

                  {/* Oblicuo Abdominal Izquierdo y Derecho */}
                  <rect
                    x="92"
                    y="156"
                    width="18"
                    height="34"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('oblicuo_abdomen_izq')}
                    onMouseEnter={() => setHoveredCode('oblicuo_abdomen_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('oblicuo_abdomen_izq')}
                  >
                    <title>Oblicuo abdominal Izquierdo (Torsiones bruscas)</title>
                  </rect>
                  <rect
                    x="145"
                    y="156"
                    width="18"
                    height="34"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('oblicuo_abdomen_der')}
                    onMouseEnter={() => setHoveredCode('oblicuo_abdomen_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('oblicuo_abdomen_der')}
                  >
                    <title>Oblicuo abdominal Derecho (Torsiones bruscas)</title>
                  </rect>

                  {/* --- PELVIS, FLEXORES Y ADUCTORES (FRONTAL) --- */}
                  {/* Pubis / Sínfisis Púbica */}
                  <ellipse
                    cx="127.5"
                    cy="198"
                    rx="13"
                    ry="8"
                    onClick={() => handleSelectZoneMacro('pubis')}
                    onMouseEnter={() => setHoveredCode('pubis')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('pubis')}
                  >
                    <title>Pubis / Sínfisis Púbica (Pubalgia)</title>
                  </ellipse>

                  {/* Psoas Ilíaco Izquierdo y Derecho */}
                  <rect
                    x="109"
                    y="196"
                    width="14"
                    height="20"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('psoas_iliaco_izq')}
                    onMouseEnter={() => setHoveredCode('psoas_iliaco_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('psoas_iliaco_izq')}
                  >
                    <title>Psoas ilíaco Izquierdo (Flexión en golpeo)</title>
                  </rect>
                  <rect
                    x="132"
                    y="196"
                    width="14"
                    height="20"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('psoas_iliaco_der')}
                    onMouseEnter={() => setHoveredCode('psoas_iliaco_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('psoas_iliaco_der')}
                  >
                    <title>Psoas ilíaco Derecho (Flexión en golpeo)</title>
                  </rect>

                  {/* Tensor de la Fascia Lata Izquierdo y Derecho */}
                  <rect
                    x="76"
                    y="210"
                    width="14"
                    height="38"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('tensor_fascia_lata_izq')}
                    onMouseEnter={() => setHoveredCode('tensor_fascia_lata_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('tensor_fascia_lata_izq')}
                  >
                    <title>Tensor de la fascia lata Izquierdo (Estabilización pélvica)</title>
                  </rect>
                  <rect
                    x="165"
                    y="210"
                    width="14"
                    height="38"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('tensor_fascia_lata_der')}
                    onMouseEnter={() => setHoveredCode('tensor_fascia_lata_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('tensor_fascia_lata_der')}
                  >
                    <title>Tensor de la fascia lata Derecho (Estabilización pélvica)</title>
                  </rect>

                  {/* Pectíneo Izquierdo y Derecho */}
                  <rect
                    x="112"
                    y="212"
                    width="12"
                    height="16"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('pectineo_izq')}
                    onMouseEnter={() => setHoveredCode('pectineo_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('pectineo_izq')}
                  >
                    <title>Pectíneo Izquierdo (Flexión y aducción)</title>
                  </rect>
                  <rect
                    x="131"
                    y="212"
                    width="12"
                    height="16"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('pectineo_der')}
                    onMouseEnter={() => setHoveredCode('pectineo_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('pectineo_der')}
                  >
                    <title>Pectíneo Derecho (Flexión y aducción)</title>
                  </rect>

                  {/* Aductor Largo Izquierdo y Derecho */}
                  <rect
                    x="110"
                    y="222"
                    width="15"
                    height="42"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('aductor_largo_izq')}
                    onMouseEnter={() => setHoveredCode('aductor_largo_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('aductor_largo_izq')}
                  >
                    <title>Aductor largo Izquierdo (Pases de interior y giros)</title>
                  </rect>
                  <rect
                    x="130"
                    y="222"
                    width="15"
                    height="42"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('aductor_largo_der')}
                    onMouseEnter={() => setHoveredCode('aductor_largo_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('aductor_largo_der')}
                  >
                    <title>Aductor largo Derecho (Pases de interior y giros)</title>
                  </rect>

                  {/* Aductor Mayor Izquierdo y Derecho */}
                  <rect
                    x="115"
                    y="236"
                    width="13"
                    height="44"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('aductor_mayor_izq')}
                    onMouseEnter={() => setHoveredCode('aductor_mayor_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('aductor_mayor_izq')}
                  >
                    <title>Aductor mayor Izquierdo (Tracción extrema)</title>
                  </rect>
                  <rect
                    x="127"
                    y="236"
                    width="13"
                    height="44"
                    rx="3"
                    onClick={() => handleSelectZoneMacro('aductor_mayor_der')}
                    onMouseEnter={() => setHoveredCode('aductor_mayor_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('aductor_mayor_der')}
                  >
                    <title>Aductor mayor Derecho (Tracción extrema)</title>
                  </rect>

                  {/* Grácil (Recto Interno) Izquierdo y Derecho */}
                  <rect
                    x="122"
                    y="246"
                    width="9"
                    height="48"
                    rx="2"
                    onClick={() => handleSelectZoneMacro('gracil_izq')}
                    onMouseEnter={() => setHoveredCode('gracil_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gracil_izq')}
                  >
                    <title>Grácil Izquierdo (Torsión con pie fijo)</title>
                  </rect>
                  <rect
                    x="124"
                    y="246"
                    width="9"
                    height="48"
                    rx="2"
                    onClick={() => handleSelectZoneMacro('gracil_der')}
                    onMouseEnter={() => setHoveredCode('gracil_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gracil_der')}
                  >
                    <title>Grácil Derecho (Torsión con pie fijo)</title>
                  </rect>

                  {/* --- CUÁDRICEPS Y MUSLO ANTERIOR (FRONTAL) --- */}
                  {/* Recto anterior (cuádriceps) Izquierdo y Derecho */}
                  <rect
                    x="97"
                    y="214"
                    width="19"
                    height="66"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('recto_femoral_izq')}
                    onMouseEnter={() => setHoveredCode('recto_femoral_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('recto_femoral_izq')}
                  >
                    <title>Recto anterior Izquierdo (Golpeo de balón y frenazos)</title>
                  </rect>
                  <rect
                    x="139"
                    y="214"
                    width="19"
                    height="66"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('recto_femoral_der')}
                    onMouseEnter={() => setHoveredCode('recto_femoral_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('recto_femoral_der')}
                  >
                    <title>Recto anterior Derecho (Golpeo de balón y frenazos)</title>
                  </rect>

                  {/* Vasto Lateral Izquierdo y Derecho */}
                  <rect
                    x="83"
                    y="224"
                    width="15"
                    height="55"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('vasto_lateral_izq')}
                    onMouseEnter={() => setHoveredCode('vasto_lateral_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('vasto_lateral_izq')}
                  >
                    <title>Vasto lateral Izquierdo (Extensión y desaceleración)</title>
                  </rect>
                  <rect
                    x="157"
                    y="224"
                    width="15"
                    height="55"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('vasto_lateral_der')}
                    onMouseEnter={() => setHoveredCode('vasto_lateral_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('vasto_lateral_der')}
                  >
                    <title>Vasto lateral Derecho (Extensión y desaceleración)</title>
                  </rect>

                  {/* Vasto Medial Izquierdo y Derecho */}
                  <rect
                    x="112"
                    y="266"
                    width="15"
                    height="28"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('vasto_medial_izq')}
                    onMouseEnter={() => setHoveredCode('vasto_medial_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('vasto_medial_izq')}
                  >
                    <title>Vasto medial Izquierdo (Estabilización de rótula)</title>
                  </rect>
                  <rect
                    x="128"
                    y="266"
                    width="15"
                    height="28"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('vasto_medial_der')}
                    onMouseEnter={() => setHoveredCode('vasto_medial_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('vasto_medial_der')}
                  >
                    <title>Vasto medial Derecho (Estabilización de rótula)</title>
                  </rect>

                  {/* Sartorio Izquierdo y Derecho */}
                  <path
                    d="M90,212 Q111,258 129,302"
                    strokeWidth="6"
                    strokeLinecap="round"
                    onClick={() => handleSelectZoneMacro('sartorio_izq')}
                    onMouseEnter={() => setHoveredCode('sartorio_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('sartorio_izq')}
                  >
                    <title>Sartorio Izquierdo (Flexión combinada cadera y rodilla)</title>
                  </path>
                  <path
                    d="M165,212 Q144,258 126,302"
                    strokeWidth="6"
                    strokeLinecap="round"
                    onClick={() => handleSelectZoneMacro('sartorio_der')}
                    onMouseEnter={() => setHoveredCode('sartorio_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('sartorio_der')}
                  >
                    <title>Sartorio Derecho (Flexión combinada cadera y rodilla)</title>
                  </path>

                  {/* Rodilla / LCA / Menisco */}
                  <circle
                    cx="137"
                    cy="304"
                    r="11"
                    onClick={() => handleSelectZoneMacro('ligamento_cruzado_ant_der')}
                    onMouseEnter={() => setHoveredCode('ligamento_cruzado_ant_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('ligamento_cruzado_ant_der')}
                  >
                    <title>LCA y Meniscos Rodilla Derecha</title>
                  </circle>

                  {/* --- PIERNA INFERIOR (FRONTAL) --- */}
                  {/* Tibial Anterior Izquierdo y Derecho */}
                  <rect
                    x="105"
                    y="325"
                    width="15"
                    height="65"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('tibial_anterior_izq')}
                    onMouseEnter={() => setHoveredCode('tibial_anterior_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('tibial_anterior_izq')}
                  >
                    <title>Tibial anterior Izquierdo (Sobrecarga y terrenos duros)</title>
                  </rect>
                  <rect
                    x="135"
                    y="325"
                    width="15"
                    height="65"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('tibial_anterior_der')}
                    onMouseEnter={() => setHoveredCode('tibial_anterior_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('tibial_anterior_der')}
                  >
                    <title>Tibial anterior Derecho (Sobrecarga y terrenos duros)</title>
                  </rect>

                  {/* Peroneos Laterales Izquierdos y Derechos */}
                  <rect
                    x="92"
                    y="335"
                    width="12"
                    height="58"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('peroneo_lateral_izq')}
                    onMouseEnter={() => setHoveredCode('peroneo_lateral_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('peroneo_lateral_izq')}
                  >
                    <title>Peroneos laterales Izquierdos (Esguince por inversión)</title>
                  </rect>
                  <rect
                    x="151"
                    y="335"
                    width="12"
                    height="58"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('peroneo_lateral_der')}
                    onMouseEnter={() => setHoveredCode('peroneo_lateral_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('peroneo_lateral_der')}
                  >
                    <title>Peroneos laterales Derechos (Esguince por inversión)</title>
                  </rect>

                  {/* Tobillos */}
                  <circle
                    cx="117"
                    cy="412"
                    r="11"
                    onClick={() => handleSelectZoneMacro('tobillo_der')}
                    onMouseEnter={() => setHoveredCode('tobillo_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className="fill-transparent cursor-pointer hover:fill-emerald-400/25 stroke-slate-500/20"
                  >
                    <title>Ligamento Tobillo Izquierdo</title>
                  </circle>
                  <circle
                    cx="138"
                    cy="412"
                    r="11"
                    onClick={() => handleSelectZoneMacro('tobillo_der')}
                    onMouseEnter={() => setHoveredCode('tobillo_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className="fill-transparent cursor-pointer hover:fill-emerald-400/25 stroke-slate-500/20"
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

                <svg viewBox="0 0 255 495" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="xMidYMid meet">
                  {/* --- ESPALDA Y HOMBRO POSTERIOR (PORTERO / TRONCO) --- */}
                  {/* Subescapular / Redondo Mayor Izquierdo y Derecho */}
                  <circle
                    cx="89"
                    cy="138"
                    r="13"
                    onClick={() => handleSelectZoneMacro('subescapular_izq')}
                    onMouseEnter={() => setHoveredCode('subescapular_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('subescapular_izq')}
                  >
                    <title>Subescapular / Redondo mayor Izquierdo (Saques de mano)</title>
                  </circle>
                  <circle
                    cx="166"
                    cy="138"
                    r="13"
                    onClick={() => handleSelectZoneMacro('subescapular_der')}
                    onMouseEnter={() => setHoveredCode('subescapular_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('subescapular_der')}
                  >
                    <title>Subescapular / Redondo mayor Derecho (Saques de mano)</title>
                  </circle>

                  {/* Dorsal Ancho Izquierdo y Derecho */}
                  <rect
                    x="91"
                    y="132"
                    width="26"
                    height="52"
                    rx="6"
                    onClick={() => handleSelectZoneMacro('dorsal_ancho_izq')}
                    onMouseEnter={() => setHoveredCode('dorsal_ancho_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('dorsal_ancho_izq')}
                  >
                    <title>Dorsal ancho Izquierdo (Caídas e impactos contra postes)</title>
                  </rect>
                  <rect
                    x="138"
                    y="132"
                    width="26"
                    height="52"
                    rx="6"
                    onClick={() => handleSelectZoneMacro('dorsal_ancho_der')}
                    onMouseEnter={() => setHoveredCode('dorsal_ancho_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('dorsal_ancho_der')}
                  >
                    <title>Dorsal ancho Derecho (Caídas e impactos contra postes)</title>
                  </rect>

                  {/* Erectores de la Columna (Masa Lumbar) */}
                  <rect
                    x="115"
                    y="160"
                    width="25"
                    height="46"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('erectores_columna')}
                    onMouseEnter={() => setHoveredCode('erectores_columna')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('erectores_columna')}
                  >
                    <title>Erectores de la columna (Impactos axiales y saltos)</title>
                  </rect>

                  {/* --- GLÚTEOS (POSTERIOR) --- */}
                  <rect
                    x="85"
                    y="198"
                    width="38"
                    height="34"
                    rx="8"
                    onClick={() => handleSelectZoneMacro('gluteo_mayor_izq')}
                    onMouseEnter={() => setHoveredCode('gluteo_mayor_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gluteo_mayor_izq')}
                  >
                    <title>Glúteo mayor Izquierdo</title>
                  </rect>
                  <rect
                    x="132"
                    y="198"
                    width="38"
                    height="34"
                    rx="8"
                    onClick={() => handleSelectZoneMacro('gluteo_mayor_der')}
                    onMouseEnter={() => setHoveredCode('gluteo_mayor_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gluteo_mayor_der')}
                  >
                    <title>Glúteo mayor Derecho</title>
                  </rect>

                  {/* --- ISQUIOTIBIALES DESGLOSADOS (POSTERIOR) --- */}
                  {/* Semitendinoso Izquierdo y Derecho (Medial Proximal) */}
                  <rect
                    x="107"
                    y="234"
                    width="15"
                    height="55"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('semitendinoso_izq')}
                    onMouseEnter={() => setHoveredCode('semitendinoso_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('semitendinoso_izq')}
                  >
                    <title>Semitendinoso Izquierdo (Extensión y carrera continua)</title>
                  </rect>
                  <rect
                    x="133"
                    y="234"
                    width="15"
                    height="55"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('semitendinoso_der')}
                    onMouseEnter={() => setHoveredCode('semitendinoso_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('semitendinoso_der')}
                  >
                    <title>Semitendinoso Derecho (Extensión y carrera continua)</title>
                  </rect>

                  {/* Semimembranoso Izquierdo y Derecho (Medial Distal/Profundo) */}
                  <rect
                    x="115"
                    y="256"
                    width="14"
                    height="42"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('semimembranoso_izq')}
                    onMouseEnter={() => setHoveredCode('semimembranoso_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('semimembranoso_izq')}
                  >
                    <title>Semimembranoso Izquierdo (Frenazos de golpe y giros)</title>
                  </rect>
                  <rect
                    x="126"
                    y="256"
                    width="14"
                    height="42"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('semimembranoso_der')}
                    onMouseEnter={() => setHoveredCode('semimembranoso_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('semimembranoso_der')}
                  >
                    <title>Semimembranoso Derecho (Frenazos de golpe y giros)</title>
                  </rect>

                  {/* Bíceps Femoral Cabeza Larga Izquierda y Derecha (Lateral) */}
                  <rect
                    x="92"
                    y="234"
                    width="18"
                    height="58"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('biceps_femoral_larga_izq')}
                    onMouseEnter={() => setHoveredCode('biceps_femoral_larga_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('biceps_femoral_larga_izq')}
                  >
                    <title>Bíceps femoral cabeza larga Izquierda (Sprints a máxima velocidad)</title>
                  </rect>
                  <rect
                    x="145"
                    y="234"
                    width="18"
                    height="58"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('biceps_femoral_larga_der')}
                    onMouseEnter={() => setHoveredCode('biceps_femoral_larga_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('biceps_femoral_larga_der')}
                  >
                    <title>Bíceps femoral cabeza larga Derecha (Sprints a máxima velocidad)</title>
                  </rect>

                  {/* Bíceps Femoral Cabeza Corta Izquierda y Derecha (Lateral Distal) */}
                  <rect
                    x="86"
                    y="268"
                    width="13"
                    height="32"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('biceps_femoral_corta_izq')}
                    onMouseEnter={() => setHoveredCode('biceps_femoral_corta_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('biceps_femoral_corta_izq')}
                  >
                    <title>Bíceps femoral cabeza corta Izquierda (Flexión en velocidad)</title>
                  </rect>
                  <rect
                    x="156"
                    y="268"
                    width="13"
                    height="32"
                    rx="4"
                    onClick={() => handleSelectZoneMacro('biceps_femoral_corta_der')}
                    onMouseEnter={() => setHoveredCode('biceps_femoral_corta_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('biceps_femoral_corta_der')}
                  >
                    <title>Bíceps femoral cabeza corta Derecha (Flexión en velocidad)</title>
                  </rect>

                  {/* --- PANTORRILLA (POSTERIOR) --- */}
                  {/* Gemelo Interno (Gastrocnemio Medial) */}
                  <rect
                    x="111"
                    y="318"
                    width="17"
                    height="48"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('gastrocnemio_medial_izq')}
                    onMouseEnter={() => setHoveredCode('gastrocnemio_medial_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gastrocnemio_medial_izq')}
                  >
                    <title>Gemelo interno Izquierdo (Saltos y arrancadas)</title>
                  </rect>
                  <rect
                    x="127"
                    y="318"
                    width="17"
                    height="48"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('gastrocnemio_medial_der')}
                    onMouseEnter={() => setHoveredCode('gastrocnemio_medial_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gastrocnemio_medial_der')}
                  >
                    <title>Gemelo interno Derecho (Saltos y arrancadas)</title>
                  </rect>

                  {/* Gemelo Externo (Gastrocnemio Lateral) */}
                  <rect
                    x="94"
                    y="318"
                    width="16"
                    height="45"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('gastrocnemio_lateral_izq')}
                    onMouseEnter={() => setHoveredCode('gastrocnemio_lateral_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gastrocnemio_lateral_izq')}
                  >
                    <title>Gemelo externo Izquierdo (Empuje lateral)</title>
                  </rect>
                  <rect
                    x="145"
                    y="318"
                    width="16"
                    height="45"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('gastrocnemio_lateral_der')}
                    onMouseEnter={() => setHoveredCode('gastrocnemio_lateral_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('gastrocnemio_lateral_der')}
                  >
                    <title>Gemelo externo Derecho (Empuje lateral)</title>
                  </rect>

                  {/* Sóleo */}
                  <rect
                    x="100"
                    y="356"
                    width="22"
                    height="40"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('soleo_izq')}
                    onMouseEnter={() => setHoveredCode('soleo_izq')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('soleo_izq')}
                  >
                    <title>Sóleo Izquierdo (Fatiga y resistencia)</title>
                  </rect>
                  <rect
                    x="133"
                    y="356"
                    width="22"
                    height="40"
                    rx="5"
                    onClick={() => handleSelectZoneMacro('soleo_der')}
                    onMouseEnter={() => setHoveredCode('soleo_der')}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={getShapeClasses('soleo_der')}
                  >
                    <title>Sóleo Derecho (Fatiga y resistencia)</title>
                  </rect>
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
            {(hoveredCode && ANATOMICAL_ZONES[hoveredCode]?.name) ||
              (selectedCode && ANATOMICAL_ZONES[selectedCode]?.name) ||
              'Haz clic sobre una zona para examinar'}
          </span>
          {zoomMode === 'micro' && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/70 font-mono font-bold">
              Porción: {availableSubportions.find((s) => s.code === (hoveredSubportion || selectedSubportion))?.shortLabel || 'UMT'}
            </span>
          )}
        </div>

        {((hoveredCode && injuryStatusByZone[hoveredCode]?.hasActive) ||
          (selectedCode && injuryStatusByZone[selectedCode]?.hasActive)) && (
          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
            <ShieldAlert size={14} />
            <span>Episodio Lesional Activo Registrado</span>
          </div>
        )}
      </div>
    </div>
  );
}
