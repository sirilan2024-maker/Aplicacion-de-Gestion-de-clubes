import React, { useState, useRef, useEffect } from 'react';
import { Hand, Mouse, Check, Maximize2, RotateCw } from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone } from '@/hooks/useAnatomySelection';

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

  // Determinar la vista visual activa según cameraView o modo
  const showDual = mode === '2D';
  const isPosterior = cameraView === 'posterior';
  const isFrontal = cameraView === 'frontal';

  // Manejador de rotación interactiva con ratón
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

  // Restablecer zoom y rotación al cambiar de vista
  useEffect(() => {
    setRotation(0);
    setZoom(1);
  }, [cameraView]);

  const selectedZone = ANATOMICAL_ZONES[selectedCode];

  // Helper para renderizar hitbox anatómica SVG interactiva
  const renderHitbox = (
    code: string,
    dOrShape: React.ReactNode,
    label: string
  ) => {
    const isSelected = selectedCode === code;
    const isHovered = hoveredCode === code;

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
        {dOrShape}
        <title>{label}</title>
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
      {/* Luz focal superior cinematográfica */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-800/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

      {/* Indicador de ayuda visual lateral izquierdo */}
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

      {/* Pin / Etiqueta flotante con línea conectora al músculo seleccionado */}
      {selectedCode && (
        <div
          className={`absolute z-30 transition-all duration-300 pointer-events-none ${
            selectedCode.includes('isquiotibiales_der')
              ? 'top-[42%] right-[10%] sm:right-[16%]'
              : selectedCode.includes('isquiotibiales_izq')
              ? 'top-[42%] left-[10%] sm:left-[16%]'
              : 'top-[35%] right-[12%]'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-rose-500 text-white shadow-xl shadow-rose-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black">
              <Check size={11} strokeWidth={3} />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-rose-200 tracking-tight">
                {selectedZone?.name || 'Músculo seleccionado'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                Región activa
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Avatar Anatómico con soporte de transformación (Zoom y Rotación) */}
      <div
        className="relative flex items-center justify-center gap-6 sm:gap-12 transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) rotateY(${rotation}deg)`,
        }}
      >
        {/* ============================================================
            FIGURA POSTERIOR (Espalda, Isquios, Glúteos, Gemelos)
            ============================================================ */}
        {(cameraView === 'posterior' || cameraView === 'lateral_der' || mode === '2D') && (
          <div className="relative w-[190px] sm:w-[220px] h-[400px] sm:h-[460px] flex items-center justify-center group">
            <img
              src="/models/avatar_back_unlit.png"
              alt="Anatomía Posterior"
              className="w-full h-full object-contain filter contrast-105 drop-shadow-2xl pointer-events-none"
            />

            {/* Capa SVG interactiva anatómica POSTERIOR */}
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Espalda / Dorsal */}
              {renderHitbox(
                'dorsal',
                <path
                  d="M95,85 Q127,100 160,85 L155,145 Q127,150 100,145 Z"
                  className={`${
                    selectedCode === 'dorsal'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Espalda / Dorsal'
              )}

              {/* Zona Lumbar */}
              {renderHitbox(
                'lumbar',
                <rect
                  x="105"
                  y="148"
                  width="45"
                  height="30"
                  rx="6"
                  className={`${
                    selectedCode === 'lumbar'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Zona Lumbar'
              )}

              {/* Glúteo Izquierdo */}
              {renderHitbox(
                'gluteo_izq',
                <rect
                  x="88"
                  y="180"
                  width="36"
                  height="34"
                  rx="8"
                  className={`${
                    selectedCode === 'gluteo_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Glúteo Izquierdo'
              )}

              {/* Glúteo Derecho */}
              {renderHitbox(
                'gluteo_der',
                <rect
                  x="131"
                  y="180"
                  width="36"
                  height="34"
                  rx="8"
                  className={`${
                    selectedCode === 'gluteo_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Glúteo Derecho'
              )}

              {/* ISQUIOTIBIALES DERECHO (ESTADO INICIAL ESTRELLA) */}
              {renderHitbox(
                'isquiotibiales_der',
                <rect
                  x="133"
                  y="214"
                  width="38"
                  height="80"
                  rx="9"
                  className={`${
                    selectedCode === 'isquiotibiales_der'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Isquiotibiales Derecho'
              )}

              {/* Isquiotibiales Izquierdo */}
              {renderHitbox(
                'isquiotibiales_izq',
                <rect
                  x="84"
                  y="214"
                  width="38"
                  height="80"
                  rx="9"
                  className={`${
                    selectedCode === 'isquiotibiales_izq'
                      ? 'fill-rose-600/75 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Isquiotibiales Izquierdo'
              )}

              {/* Gemelo / Pantorrilla Derecha */}
              {renderHitbox(
                'gemelos_der',
                <rect
                  x="135"
                  y="304"
                  width="33"
                  height="90"
                  rx="8"
                  className={`${
                    selectedCode === 'gemelos_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Gemelo Derecho'
              )}

              {/* Gemelo / Pantorrilla Izquierda */}
              {renderHitbox(
                'gemelos_izq',
                <rect
                  x="87"
                  y="304"
                  width="33"
                  height="90"
                  rx="8"
                  className={`${
                    selectedCode === 'gemelos_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Gemelo Izquierdo'
              )}
            </svg>
          </div>
        )}

        {/* ============================================================
            FIGURA FRONTAL (Pectoral, Abdomen, Cuádriceps, Rodillas)
            ============================================================ */}
        {(cameraView === 'frontal' || cameraView === 'lateral_izq' || mode === '2D') && (
          <div className="relative w-[190px] sm:w-[220px] h-[400px] sm:h-[460px] flex items-center justify-center group">
            <img
              src="/models/avatar_front_reference_clean.png"
              alt="Anatomía Frontal"
              className="w-full h-full object-contain filter contrast-105 drop-shadow-2xl pointer-events-none"
            />

            {/* Capa SVG interactiva anatómica FRONTAL */}
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Cabeza */}
              {renderHitbox(
                'cabeza',
                <circle
                  cx="127"
                  cy="42"
                  r="23"
                  className={`${
                    selectedCode === 'cabeza'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Cabeza'
              )}

              {/* Cuello */}
              {renderHitbox(
                'cuello',
                <rect
                  x="115"
                  y="65"
                  width="25"
                  height="16"
                  rx="4"
                  className={`${
                    selectedCode === 'cuello'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Cuello'
              )}

              {/* Pectoral */}
              {renderHitbox(
                'pecho',
                <rect
                  x="96"
                  y="83"
                  width="63"
                  height="34"
                  rx="6"
                  className={`${
                    selectedCode === 'pecho'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Pectoral'
              )}

              {/* Abdomen / Core */}
              {renderHitbox(
                'abdomen',
                <rect
                  x="104"
                  y="120"
                  width="47"
                  height="50"
                  rx="6"
                  className={`${
                    selectedCode === 'abdomen'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Abdomen / Core'
              )}

              {/* Hombro Derecho (vista espectador izquierda) */}
              {renderHitbox(
                'hombro_der',
                <circle
                  cx="76"
                  cy="92"
                  r="14"
                  className={`${
                    selectedCode === 'hombro_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Hombro Derecho'
              )}

              {/* Hombro Izquierdo (vista espectador derecha) */}
              {renderHitbox(
                'hombro_izq',
                <circle
                  cx="178"
                  cy="92"
                  r="14"
                  className={`${
                    selectedCode === 'hombro_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Hombro Izquierdo'
              )}

              {/* Brazo Derecho */}
              {renderHitbox(
                'brazo_der',
                <rect
                  x="56"
                  y="110"
                  width="22"
                  height="45"
                  rx="6"
                  className={`${
                    selectedCode === 'brazo_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Brazo Derecho'
              )}

              {/* Brazo Izquierdo */}
              {renderHitbox(
                'brazo_izq',
                <rect
                  x="177"
                  y="110"
                  width="22"
                  height="45"
                  rx="6"
                  className={`${
                    selectedCode === 'brazo_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Brazo Izquierdo'
              )}

              {/* Cuádriceps Derecho (vista espectador izquierda) */}
              {renderHitbox(
                'cuadriceps_der',
                <rect
                  x="86"
                  y="208"
                  width="38"
                  height="78"
                  rx="8"
                  className={`${
                    selectedCode === 'cuadriceps_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Cuádriceps Derecho'
              )}

              {/* Cuádriceps Izquierdo (vista espectador derecha) */}
              {renderHitbox(
                'cuadriceps_izq',
                <rect
                  x="131"
                  y="208"
                  width="38"
                  height="78"
                  rx="8"
                  className={`${
                    selectedCode === 'cuadriceps_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Cuádriceps Izquierdo'
              )}

              {/* Rodilla Derecha */}
              {renderHitbox(
                'rodilla_der',
                <circle
                  cx="105"
                  cy="295"
                  r="12"
                  className={`${
                    selectedCode === 'rodilla_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Rodilla Derecha'
              )}

              {/* Rodilla Izquierda */}
              {renderHitbox(
                'rodilla_izq',
                <circle
                  cx="150"
                  cy="295"
                  r="12"
                  className={`${
                    selectedCode === 'rodilla_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Rodilla Izquierda'
              )}

              {/* Tobillo Derecho */}
              {renderHitbox(
                'tobillo_der',
                <circle
                  cx="105"
                  cy="400"
                  r="10"
                  className={`${
                    selectedCode === 'tobillo_der'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Tobillo Derecho'
              )}

              {/* Tobillo Izquierdo */}
              {renderHitbox(
                'tobillo_izq',
                <circle
                  cx="150"
                  cy="400"
                  r="10"
                  className={`${
                    selectedCode === 'tobillo_izq'
                      ? 'fill-rose-600/70 stroke-rose-400 stroke-2 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'fill-transparent hover:fill-emerald-400/30'
                  }`}
                />,
                'Tobillo Izquierdo'
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
