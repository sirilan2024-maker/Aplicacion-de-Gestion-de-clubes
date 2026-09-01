import React, { useState, useRef, useEffect } from 'react';
import { Hand, Mouse, CheckCircle2 } from 'lucide-react';
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
      return Math.min(Math.max(next, 0.85), 1.5);
    });
  };

  useEffect(() => {
    setRotation(0);
    setZoom(1);
  }, [cameraView]);

  const selectedZone = selectedCode ? ANATOMICAL_ZONES[selectedCode] : null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[400px] sm:h-[450px] bg-gradient-to-b from-[#0e1420] via-[#090d14] to-[#06080d] rounded-2xl flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Luz focal suave central */}
      <div className="absolute inset-0 bg-radial from-slate-800/10 via-transparent to-transparent pointer-events-none" />

      {/* 1. Recuadro flotante de ayuda visual izquierda (Exacto al mockup) */}
      <div className="absolute top-8 left-4 bg-[#0a0e17]/85 border border-slate-800/80 rounded-xl p-2 flex flex-col gap-2 z-20 pointer-events-none shadow-lg">
        <div className="flex flex-col items-center text-center">
          <Hand size={14} className="text-slate-300 mb-1" />
          <span className="text-[9px] text-slate-400 font-medium leading-tight">
            Arrastrar<br />para rotar
          </span>
        </div>
        <div className="w-full h-px bg-slate-800" />
        <div className="flex flex-col items-center text-center">
          <Mouse size={14} className="text-slate-300 mb-1" />
          <span className="text-[9px] text-slate-400 font-medium leading-tight">
            Rueda<br />para zoom
          </span>
        </div>
      </div>

      {/* 2. Pin flotante con línea conectora (Exacto al mockup de Marco Sanchez) */}
      {selectedCode && (
        <div className="absolute right-4 sm:right-10 top-[60%] z-20 pointer-events-none flex items-center">
          {/* Línea conectora */}
          <div className="hidden sm:block w-12 h-px bg-slate-700 -mr-1" />
          {/* Tarjeta del pin */}
          <div className="bg-[#0b0f17]/95 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-slate-300">
                {selectedZone?.muscleGroup || 'Isquiotibiales'}
              </span>
              <span className="text-xs font-bold text-white">
                {selectedZone?.laterality || 'Derecho'}
              </span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          </div>
        </div>
      )}

      {/* 3. Contenedor del Avatar 3D / 2D interactivo */}
      <div
        className="relative flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) rotateY(${rotation}deg)`,
        }}
      >
        {/* Vista Frontal */}
        {(cameraView === 'frontal' || cameraView === 'lateral_izq' || mode === '2D') && (
          <div className="relative w-[180px] sm:w-[205px] h-[370px] sm:h-[420px] flex items-center justify-center">
            {/* Si está seleccionado Isquiotibiales Derecho, mostrar el avatar exacto del mockup */}
            <img
              src={
                selectedCode === 'isquiotibiales_der' || selectedCode.includes('isquiotibiales')
                  ? '/models/avatar_exact_mockup.png'
                  : '/models/avatar_front_reference_clean.png'
              }
              alt="Avatar Anatómico Masculino"
              className="w-full h-full object-contain filter contrast-105 pointer-events-none"
            />

            {/* Capa de selección interactiva transparente sobre el avatar */}
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Muslo Derecho (conectar a isquiotibiales_der / recto anterior) */}
              <rect
                x="128"
                y="206"
                width="38"
                height="80"
                rx="8"
                onClick={() => onSelect('isquiotibiales_der')}
                onMouseEnter={() => onHover('isquiotibiales_der')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              >
                <title>Isquiotibiales Derecho</title>
              </rect>

              {/* Muslo Izquierdo */}
              <rect
                x="88"
                y="206"
                width="38"
                height="80"
                rx="8"
                onClick={() => onSelect('isquiotibiales_izq')}
                onMouseEnter={() => onHover('isquiotibiales_izq')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              >
                <title>Isquiotibiales Izquierdo</title>
              </rect>

              {/* Pubis */}
              <ellipse
                cx="127"
                cy="176"
                rx="14"
                ry="9"
                onClick={() => onSelect('pubis')}
                onMouseEnter={() => onHover('pubis')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              >
                <title>Pubis / Pubalgia</title>
              </ellipse>

              {/* Rodillas */}
              <circle
                cx="105"
                cy="295"
                r="12"
                onClick={() => onSelect('rodilla_der')}
                onMouseEnter={() => onHover('rodilla_der')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              />
              <circle
                cx="150"
                cy="295"
                r="12"
                onClick={() => onSelect('rodilla_izq')}
                onMouseEnter={() => onHover('rodilla_izq')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              />

              {/* Tobillos */}
              <circle
                cx="105"
                cy="400"
                r="10"
                onClick={() => onSelect('tobillo_der')}
                onMouseEnter={() => onHover('tobillo_der')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              />
              <circle
                cx="150"
                cy="400"
                r="10"
                onClick={() => onSelect('tobillo_izq')}
                onMouseEnter={() => onHover('tobillo_izq')}
                onMouseLeave={() => onHover(null)}
                className="fill-transparent cursor-pointer hover:fill-emerald-400/25 transition-colors"
              />
            </svg>
          </div>
        )}

        {/* Vista Posterior */}
        {cameraView === 'posterior' && (
          <div className="relative w-[180px] sm:w-[205px] h-[370px] sm:h-[420px] flex items-center justify-center">
            <img
              src="/models/avatar_back_unlit.png"
              alt="Avatar Posterior"
              className="w-full h-full object-contain filter contrast-105 pointer-events-none"
            />
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Isquiotibiales Derecho Posterior */}
              <rect
                x="133"
                y="214"
                width="38"
                height="80"
                rx="9"
                onClick={() => onSelect('isquiotibiales_der')}
                onMouseEnter={() => onHover('isquiotibiales_der')}
                onMouseLeave={() => onHover(null)}
                className={`cursor-pointer ${
                  selectedCode === 'isquiotibiales_der'
                    ? 'fill-rose-600/75 stroke-rose-400 stroke-2'
                    : 'fill-transparent hover:fill-emerald-400/25'
                }`}
              >
                <title>Isquiotibiales Derecho</title>
              </rect>
              {/* Isquiotibiales Izquierdo Posterior */}
              <rect
                x="84"
                y="214"
                width="38"
                height="80"
                rx="9"
                onClick={() => onSelect('isquiotibiales_izq')}
                onMouseEnter={() => onHover('isquiotibiales_izq')}
                onMouseLeave={() => onHover(null)}
                className={`cursor-pointer ${
                  selectedCode === 'isquiotibiales_izq'
                    ? 'fill-rose-600/75 stroke-rose-400 stroke-2'
                    : 'fill-transparent hover:fill-emerald-400/25'
                }`}
              >
                <title>Isquiotibiales Izquierdo</title>
              </rect>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
