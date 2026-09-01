import React, { useState, useRef, useEffect } from 'react';
import { Hand, Mouse, Check } from 'lucide-react';
import { ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';

interface AnatomyViewerProps {
  mode: '3D' | '2D';
  cameraView: 'frontal' | 'posterior' | 'lateral_izq' | 'lateral_der';
  selectedCode: string;
  hoveredCode: string | null;
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
}

export function AnatomyViewer({
  mode,
  cameraView,
  selectedCode,
  hoveredCode,
  onSelect,
  onHover,
}: AnatomyViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    setRotation((prev) => prev + deltaX * 0.5);
    startXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev - e.deltaY * 0.001;
      return Math.min(Math.max(next, 0.85), 1.6);
    });
  };

  useEffect(() => {
    setRotation(0);
    setZoom(1);
  }, [cameraView]);

  const selectedZone = selectedCode ? ANATOMICAL_ZONES[selectedCode] : null;
  const hoveredZone = hoveredCode ? ANATOMICAL_ZONES[hoveredCode] : null;

  // Helper para renderizar vientre muscular, ligamento o hueso
  const renderHotspot = (
    code: string,
    shape: React.ReactNode,
    name: string,
    mecanismo?: string
  ) => {
    return (
      <g
        key={code}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(code);
        }}
        onMouseEnter={() => onHover(code)}
        onMouseLeave={() => onHover(null)}
        className="cursor-pointer transition-all duration-150"
      >
        {shape}
        <title>{`${name}${mecanismo ? ` — ${mecanismo}` : ''}`}</title>
      </g>
    );
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[480px] sm:h-[530px] rounded-3xl bg-radial from-slate-900 via-slate-950 to-black border border-slate-800/90 flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-2xl"
    >
      {/* Iluminación cenital de estudio */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-800/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

      {/* Ayuda de navegación lateral */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-slate-400 text-[10px] font-medium z-20 pointer-events-none shadow-lg">
        <div className="flex items-center gap-2">
          <Hand size={14} className="text-emerald-400 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-slate-200">Arrastrar</span>
            <span>para rotar</span>
          </div>
        </div>
        <div className="w-full h-px bg-slate-800/80" />
        <div className="flex items-center gap-2">
          <Mouse size={14} className="text-emerald-400 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-slate-200">Rueda</span>
            <span>para zoom</span>
          </div>
        </div>
      </div>

      {/* Tooltip dinámico en vivo en la parte superior central al pasar el ratón */}
      {hoveredZone && !selectedCode && (
        <div className="absolute top-6 z-30 px-3.5 py-1.5 rounded-xl bg-slate-950/95 border border-emerald-500/50 text-slate-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in duration-150 pointer-events-none flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white">{hoveredZone.name}</span>
          <span className="text-[10px] text-emerald-300 font-mono">({hoveredZone.incidencia})</span>
        </div>
      )}

      {/* Pin / Etiqueta flotante conectada al elemento anatómico seleccionado (SÓLO si hay selección activa) */}
      {selectedCode && selectedZone && (
        <div
          className={`absolute z-30 transition-all duration-300 pointer-events-none ${
            selectedCode.includes('der')
              ? 'top-[42%] right-[6%] sm:right-[12%]'
              : selectedCode.includes('izq')
              ? 'top-[42%] left-[6%] sm:left-[12%]'
              : 'top-[36%] right-[10%]'
          }`}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/95 border-2 border-rose-500 text-white shadow-2xl shadow-rose-950/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-xs">
              <Check size={12} strokeWidth={3} />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-rose-200 tracking-tight">
                {selectedZone.name}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Incidencia en fútbol: <strong className="text-rose-400">{selectedZone.incidencia}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Avatar Anatómico con transformación 3D */}
      <div
        className="relative flex items-center justify-center gap-6 sm:gap-12 transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) rotateY(${rotation}deg)`,
        }}
      >
        {/* ============================================================
            FIGURA POSTERIOR (Espalda, Isquiotibiales, Sóleo, Gemelos, Aquiles)
            ============================================================ */}
        {(cameraView === 'posterior' || cameraView === 'lateral_der' || mode === '2D') && (
          <div className="relative w-[190px] sm:w-[220px] h-[400px] sm:h-[460px] flex items-center justify-center group">
            <img
              src="/models/avatar_back_unlit.png"
              alt="Anatomía Posterior"
              className="w-full h-full object-contain filter contrast-105 drop-shadow-2xl pointer-events-none"
            />

            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Espalda / Lumbar */}
              {renderHotspot(
                'dorsal',
                <path
                  d="M95,85 Q127,100 160,85 L155,145 Q127,150 100,145 Z"
                  className={
                    selectedCode === 'dorsal'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Dorsal ancho / Espalda alta'
              )}

              {renderHotspot(
                'lumbar',
                <rect
                  x="105"
                  y="148"
                  width="45"
                  height="30"
                  rx="6"
                  className={
                    selectedCode === 'lumbar'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Zona Lumbar / Paravertebrales'
              )}

              {/* Glúteos */}
              {renderHotspot(
                'gluteo_mayor_der',
                <path
                  d="M129,180 Q152,176 166,192 Q164,215 136,218 Q127,205 129,180 Z"
                  className={
                    selectedCode === 'gluteo_mayor_der'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Glúteo mayor Derecho'
              )}

              {renderHotspot(
                'gluteo_mayor_izq',
                <path
                  d="M126,180 Q103,176 89,192 Q91,215 119,218 Q128,205 126,180 Z"
                  className={
                    selectedCode === 'gluteo_mayor_izq'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Glúteo mayor Izquierdo'
              )}

              {/* ISQUIOTIBIALES DERECHOS */}
              {renderHotspot(
                'biceps_femoral_larga_der',
                <path
                  d="M148,218 Q164,222 168,255 Q164,285 152,295 Q145,260 148,218 Z"
                  className={
                    selectedCode === 'biceps_femoral_larga_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Bíceps femoral (Cabeza larga) Derecho',
                'Sprints a máxima velocidad'
              )}

              {renderHotspot(
                'semitendinoso_der',
                <path
                  d="M136,218 Q147,220 146,260 Q142,285 137,295 Q132,255 136,218 Z"
                  className={
                    selectedCode === 'semitendinoso_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Semitendinoso Derecho'
              )}

              {renderHotspot(
                'semimembranoso_der',
                <path
                  d="M132,240 Q138,245 136,285 Q133,296 128,295 Q129,265 132,240 Z"
                  className={
                    selectedCode === 'semimembranoso_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Semimembranoso Derecho'
              )}

              {/* ISQUIOTIBIALES IZQUIERDOS */}
              {renderHotspot(
                'biceps_femoral_larga_izq',
                <path
                  d="M107,218 Q91,222 87,255 Q91,285 103,295 Q110,260 107,218 Z"
                  className={
                    selectedCode === 'biceps_femoral_larga_izq'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Bíceps femoral (Cabeza larga) Izquierdo'
              )}

              {renderHotspot(
                'semitendinoso_izq',
                <path
                  d="M119,218 Q108,220 109,260 Q113,285 118,295 Q123,255 119,218 Z"
                  className={
                    selectedCode === 'semitendinoso_izq'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Semitendinoso Izquierdo'
              )}

              {/* LIGAMENTO CRUZADO POSTERIOR (LCP) */}
              {renderHotspot(
                'ligamento_cruzado_post_der',
                <circle
                  cx="145"
                  cy="295"
                  r="7"
                  className={
                    selectedCode === 'ligamento_cruzado_post_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Ligamento Cruzado Posterior (LCP) Der.',
                'Impacto directo en flexión contra rival o poste'
              )}

              {renderHotspot(
                'ligamento_cruzado_post_izq',
                <circle
                  cx="110"
                  cy="295"
                  r="7"
                  className={
                    selectedCode === 'ligamento_cruzado_post_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Ligamento Cruzado Posterior (LCP) Izq.',
                'Impacto directo en flexión contra rival o poste'
              )}

              {/* SÓLEO DERECHO */}
              {renderHotspot(
                'soleo_der',
                <path
                  d="M136,355 Q154,358 152,388 L142,393 L136,380 Z"
                  className={
                    selectedCode === 'soleo_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/45 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Sóleo Derecho',
                'Fatiga continua y sobrecarga de partidos'
              )}

              {/* SÓLEO IZQUIERDO */}
              {renderHotspot(
                'soleo_izq',
                <path
                  d="M119,355 Q101,358 103,388 L113,393 L119,380 Z"
                  className={
                    selectedCode === 'soleo_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/45 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Sóleo Izquierdo',
                'Fatiga continua y sobrecarga de partidos'
              )}

              {/* GEMELOS */}
              {renderHotspot(
                'gastrocnemio_medial_der',
                <path
                  d="M136,306 Q146,310 144,345 Q138,365 133,366 Q131,335 136,306 Z"
                  className={
                    selectedCode === 'gastrocnemio_medial_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Gemelo interno Derecho'
              )}

              {renderHotspot(
                'gastrocnemio_lateral_der',
                <path
                  d="M148,306 Q165,312 163,350 Q152,365 145,364 Q146,335 148,306 Z"
                  className={
                    selectedCode === 'gastrocnemio_lateral_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Gemelo externo Derecho'
              )}

              {/* TENDÓN DE AQUILES */}
              {renderHotspot(
                'tendon_aquiles_der',
                <rect
                  x="142"
                  y="390"
                  width="12"
                  height="26"
                  rx="3"
                  className={
                    selectedCode === 'tendon_aquiles_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tendón de Aquiles Derecho'
              )}

              {renderHotspot(
                'tendon_aquiles_izq',
                <rect
                  x="101"
                  y="390"
                  width="12"
                  height="26"
                  rx="3"
                  className={
                    selectedCode === 'tendon_aquiles_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tendón de Aquiles Izquierdo'
              )}
            </svg>
          </div>
        )}

        {/* ============================================================
            FIGURA FRONTAL (Pubis, Cuádriceps, Meniscos, Ligamentos, Tarso, Metatarso)
            ============================================================ */}
        {(cameraView === 'frontal' || cameraView === 'lateral_izq' || mode === '2D') && (
          <div className="relative w-[190px] sm:w-[220px] h-[400px] sm:h-[460px] flex items-center justify-center group">
            <img
              src="/models/avatar_front_reference_clean.png"
              alt="Anatomía Frontal"
              className="w-full h-full object-contain filter contrast-105 drop-shadow-2xl pointer-events-none"
            />

            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Cabeza / Cuello / Tórax / Abdomen */}
              {renderHotspot(
                'cabeza',
                <circle
                  cx="127"
                  cy="42"
                  r="23"
                  className={
                    selectedCode === 'cabeza'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Cabeza'
              )}

              {renderHotspot(
                'cuello',
                <rect
                  x="115"
                  y="65"
                  width="25"
                  height="16"
                  rx="4"
                  className={
                    selectedCode === 'cuello'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Cuello'
              )}

              {renderHotspot(
                'pecho',
                <rect
                  x="96"
                  y="83"
                  width="63"
                  height="34"
                  rx="6"
                  className={
                    selectedCode === 'pecho'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Pectoral'
              )}

              {renderHotspot(
                'abdomen',
                <rect
                  x="104"
                  y="120"
                  width="47"
                  height="46"
                  rx="6"
                  className={
                    selectedCode === 'abdomen'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/35 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Recto abdominal / Core'
              )}

              {/* =======================================================
                  PUBIS / PUBALGIA / SÍNFISIS PÚBICA
                  ======================================================= */}
              {renderHotspot(
                'pubis',
                <ellipse
                  cx="127"
                  cy="176"
                  rx="14"
                  ry="9"
                  className={
                    selectedCode === 'pubis' || selectedCode === 'pubis_der' || selectedCode === 'pubis_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-rose-500/40 hover:stroke-rose-400 hover:stroke-1.5'
                  }
                />,
                'Pubis / Sínfisis Púbica (Pubalgia)',
                'Descompensación abdominal-aductores y golpeo repetitivo'
              )}

              {/* ADUCTORES */}
              {renderHotspot(
                'aductor_largo_der',
                <path
                  d="M122,185 L110,215 Q115,225 124,228 L126,188 Z"
                  className={
                    selectedCode === 'aductor_largo_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Aductor largo Derecho'
              )}

              {renderHotspot(
                'aductor_largo_izq',
                <path
                  d="M133,185 L145,215 Q140,225 131,228 L129,188 Z"
                  className={
                    selectedCode === 'aductor_largo_izq'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Aductor largo Izquierdo'
              )}

              {/* CUÁDRICEPS DERECHOS */}
              {renderHotspot(
                'recto_anterior_der',
                <path
                  d="M98,206 Q112,208 114,245 Q112,272 104,282 Q96,250 98,206 Z"
                  className={
                    selectedCode === 'recto_anterior_der' || selectedCode === 'cuadriceps_general_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Recto anterior (Cuádriceps) Derecho',
                'Golpeo potente de balón y frenazos bruscos'
              )}

              {renderHotspot(
                'vasto_lateral_der',
                <path
                  d="M84,212 Q97,210 96,252 Q94,278 88,284 Q82,245 84,212 Z"
                  className={
                    selectedCode === 'vasto_lateral_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Vasto lateral Derecho'
              )}

              {renderHotspot(
                'vasto_medial_der',
                <path
                  d="M106,255 Q117,258 116,282 Q108,288 104,280 Z"
                  className={
                    selectedCode === 'vasto_medial_der'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Vasto medial Derecho'
              )}

              {/* CUÁDRICEPS IZQUIERDOS */}
              {renderHotspot(
                'recto_anterior_izq',
                <path
                  d="M157,206 Q143,208 141,245 Q143,272 151,282 Q159,250 157,206 Z"
                  className={
                    selectedCode === 'recto_anterior_izq' || selectedCode === 'cuadriceps_general_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Recto anterior (Cuádriceps) Izquierdo',
                'Golpeo potente de balón y frenazos bruscos'
              )}

              {renderHotspot(
                'vasto_lateral_izq',
                <path
                  d="M171,212 Q158,210 159,252 Q161,278 167,284 Q173,245 171,212 Z"
                  className={
                    selectedCode === 'vasto_lateral_izq'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Vasto lateral Izquierdo'
              )}

              {renderHotspot(
                'vasto_medial_izq',
                <path
                  d="M149,255 Q138,258 139,282 Q147,288 151,280 Z"
                  className={
                    selectedCode === 'vasto_medial_izq'
                      ? 'fill-rose-600/80 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Vasto medial Izquierdo'
              )}

              {/* =======================================================
                  RODILLA DERECHA: LCA, MENISCOS Y TENDÓN ROTULIANO
                  ======================================================= */}
              {/* LCA Derecho */}
              {renderHotspot(
                'ligamento_cruzado_ant_der',
                <circle
                  cx="105"
                  cy="292"
                  r="7"
                  className={
                    selectedCode === 'ligamento_cruzado_ant_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Ligamento Cruzado Anterior (LCA) Der.',
                'Valgo forzado con rotación externa sin contacto'
              )}

              {/* Menisco Interno Derecho */}
              {renderHotspot(
                'menisco_interno_der',
                <path
                  d="M112,289 Q118,292 114,297 Q110,296 112,289 Z"
                  className={
                    selectedCode === 'menisco_interno_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Menisco Interno Derecho',
                'Torsión brusca de rodilla con pie fijo en césped'
              )}

              {/* Menisco Externo Derecho */}
              {renderHotspot(
                'menisco_externo_der',
                <path
                  d="M96,289 Q92,292 94,297 Q98,296 96,289 Z"
                  className={
                    selectedCode === 'menisco_externo_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Menisco Externo Derecho'
              )}

              {/* Tendón Rotuliano Derecho */}
              {renderHotspot(
                'tendon_rotuliano_der',
                <rect
                  x="100"
                  y="300"
                  width="11"
                  height="16"
                  rx="3"
                  className={
                    selectedCode === 'tendon_rotuliano_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tendón rotuliano Derecho'
              )}

              {/* =======================================================
                  RODILLA IZQUIERDA: LCA, MENISCOS Y TENDÓN ROTULIANO
                  ======================================================= */}
              {/* LCA Izquierdo */}
              {renderHotspot(
                'ligamento_cruzado_ant_izq',
                <circle
                  cx="150"
                  cy="292"
                  r="7"
                  className={
                    selectedCode === 'ligamento_cruzado_ant_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Ligamento Cruzado Anterior (LCA) Izq.',
                'Valgo forzado con rotación externa sin contacto'
              )}

              {/* Menisco Interno Izquierdo */}
              {renderHotspot(
                'menisco_interno_izq',
                <path
                  d="M142,289 Q136,292 140,297 Q144,296 142,289 Z"
                  className={
                    selectedCode === 'menisco_interno_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Menisco Interno Izquierdo',
                'Torsión brusca de rodilla con pie fijo en césped'
              )}

              {/* Menisco Externo Izquierdo */}
              {renderHotspot(
                'menisco_externo_izq',
                <path
                  d="M158,289 Q164,292 162,297 Q156,296 158,289 Z"
                  className={
                    selectedCode === 'menisco_externo_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Rotura Menisco Externo Izquierdo'
              )}

              {/* Tendón Rotuliano Izquierdo */}
              {renderHotspot(
                'tendon_rotuliano_izq',
                <rect
                  x="144"
                  y="300"
                  width="11"
                  height="16"
                  rx="3"
                  className={
                    selectedCode === 'tendon_rotuliano_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tendón rotuliano Izquierdo'
              )}

              {/* =======================================================
                  TOBILLO Y TARSO (ASTRÁGALO / NAVICULAR)
                  ======================================================= */}
              {/* Ligamentos Tobillo Derecho */}
              {renderHotspot(
                'tobillo_ligamentos_der',
                <circle
                  cx="106"
                  cy="402"
                  r="9"
                  className={
                    selectedCode === 'tobillo_ligamentos_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Ligamentos de Tobillo (LPAA) Derecho'
              )}

              {/* Tarso / Escafoides Tarsiano (Navicular) Derecho */}
              {renderHotspot(
                'tarso_navicular_der',
                <rect
                  x="100"
                  y="414"
                  width="12"
                  height="10"
                  rx="3"
                  className={
                    selectedCode === 'tarso_navicular_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tarso / Escafoides Tarsiano (Navicular) Der.',
                'Fractura por estrés del escafoides tarsiano'
              )}

              {/* Ligamentos Tobillo Izquierdo */}
              {renderHotspot(
                'tobillo_ligamentos_izq',
                <circle
                  cx="149"
                  cy="402"
                  r="9"
                  className={
                    selectedCode === 'tobillo_ligamentos_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Ligamentos de Tobillo (LPAA) Izquierdo'
              )}

              {/* Tarso / Escafoides Tarsiano (Navicular) Izquierdo */}
              {renderHotspot(
                'tarso_navicular_izq',
                <rect
                  x="143"
                  y="414"
                  width="12"
                  height="10"
                  rx="3"
                  className={
                    selectedCode === 'tarso_navicular_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Tarso / Escafoides Tarsiano (Navicular) Izq.',
                'Fractura por estrés del escafoides tarsiano'
              )}

              {/* =======================================================
                  METATARSO (5º METATARSIANO / JONES Y METATARSALGIA)
                  ======================================================= */}
              {/* 5º Metatarsiano (Fractura de Jones) Derecho */}
              {renderHotspot(
                'metatarso_5to_der',
                <rect
                  x="92"
                  y="426"
                  width="8"
                  height="18"
                  rx="2"
                  className={
                    selectedCode === 'metatarso_5to_der'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                '5º Metatarsiano (Fractura de Jones) Derecho',
                'Inversión violenta del mediopié en cambio de ritmo'
              )}

              {/* Metatarsos Generales (1º a 4º) Derecho */}
              {renderHotspot(
                'metatarso_general_der',
                <rect
                  x="102"
                  y="426"
                  width="14"
                  height="18"
                  rx="3"
                  className={
                    selectedCode === 'metatarso_general_der'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Metatarsalgia / Metatarsos (1º a 4º) Derecho'
              )}

              {/* 5º Metatarsiano (Fractura de Jones) Izquierdo */}
              {renderHotspot(
                'metatarso_5to_izq',
                <rect
                  x="155"
                  y="426"
                  width="8"
                  height="18"
                  rx="2"
                  className={
                    selectedCode === 'metatarso_5to_izq'
                      ? 'fill-rose-600/90 stroke-rose-300 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                '5º Metatarsiano (Fractura de Jones) Izquierdo',
                'Inversión violenta del mediopié en cambio de ritmo'
              )}

              {/* Metatarsos Generales (1º a 4º) Izquierdo */}
              {renderHotspot(
                'metatarso_general_izq',
                <rect
                  x="139"
                  y="426"
                  width="14"
                  height="18"
                  rx="3"
                  className={
                    selectedCode === 'metatarso_general_izq'
                      ? 'fill-rose-600/85 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/40 hover:stroke-emerald-300 hover:stroke-1'
                  }
                />,
                'Metatarsalgia / Metatarsos (1º a 4º) Izquierdo'
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
