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

  // Helper para clases CSS de zonas SVG (resaltado en ROJO si está seleccionada)
  const getZoneSvgClass = (code: string) => {
    const isSelected = selectedCode === code;
    const isHovered = hoveredCode === code;

    if (isSelected) {
      return 'fill-rose-600/75 stroke-rose-400 stroke-2 animate-pulse cursor-pointer';
    }
    if (isHovered) {
      return 'fill-emerald-400/35 stroke-emerald-300 stroke-1 cursor-pointer';
    }
    return 'fill-transparent hover:fill-emerald-400/25 transition-colors cursor-pointer';
  };

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

      {/* 1. Recuadro flotante de ayuda visual izquierda */}
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

      {/* 2. Pin flotante con línea conectora (cuando hay una zona seleccionada) */}
      {selectedCode && selectedZone && (
        <div className="absolute right-4 sm:right-8 top-[45%] z-20 pointer-events-none flex items-center">
          <div className="hidden sm:block w-10 h-px bg-rose-500/60 -mr-1" />
          <div className="bg-[#0b0f17]/95 border border-rose-500/70 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-rose-300">
                {selectedZone.muscleGroup || selectedZone.generalRegion}
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[140px]">
                {selectedZone.name}
              </span>
            </div>
            <CheckCircle2 size={16} className="text-rose-400 shrink-0" />
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
            {/* Imagen limpia sin textura horneada */}
            <img
              src="/models/avatar_front_reference_clean.png"
              alt="Avatar Anatómico Frontal"
              className="w-full h-full object-contain filter contrast-105 pointer-events-none"
            />

            {/* Capa de selección interactiva vectorial */}
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* --- CABEZA Y CUELLO --- */}
              <circle
                cx="127"
                cy="38"
                r="22"
                onClick={() => onSelect('cabeza_craneo')}
                onMouseEnter={() => onHover('cabeza_craneo')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('cabeza_craneo')}
              >
                <title>Cráneo / Cabeza</title>
              </circle>
              <rect
                x="118"
                y="63"
                width="18"
                height="16"
                rx="4"
                onClick={() => onSelect('cuello_cervical')}
                onMouseEnter={() => onHover('cuello_cervical')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('cuello_cervical')}
              >
                <title>Cuello</title>
              </rect>

              {/* --- HOMBROS / DELTOIDES ANTERIOR --- */}
              <circle
                cx="88"
                cy="92"
                r="14"
                onClick={() => onSelect('deltoides_ant_der')}
                onMouseEnter={() => onHover('deltoides_ant_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('deltoides_ant_der')}
              >
                <title>Deltoides Anterior Derecho</title>
              </circle>
              <circle
                cx="166"
                cy="92"
                r="14"
                onClick={() => onSelect('deltoides_ant_izq')}
                onMouseEnter={() => onHover('deltoides_ant_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('deltoides_ant_izq')}
              >
                <title>Deltoides Anterior Izquierdo</title>
              </circle>

              {/* --- BRAZOS / BÍCEPS --- */}
              <rect
                x="68"
                y="110"
                width="18"
                height="38"
                rx="7"
                onClick={() => onSelect('biceps_braquial_der')}
                onMouseEnter={() => onHover('biceps_braquial_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('biceps_braquial_der')}
              >
                <title>Bíceps Braquial Derecho</title>
              </rect>
              <rect
                x="168"
                y="110"
                width="18"
                height="38"
                rx="7"
                onClick={() => onSelect('biceps_braquial_izq')}
                onMouseEnter={() => onHover('biceps_braquial_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('biceps_braquial_izq')}
              >
                <title>Bíceps Braquial Izquierdo</title>
              </rect>

              {/* --- CODOS Y ANTEBRAZOS --- */}
              <circle
                cx="74"
                cy="154"
                r="9"
                onClick={() => onSelect('codo_der')}
                onMouseEnter={() => onHover('codo_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('codo_der')}
              >
                <title>Codo Derecho</title>
              </circle>
              <circle
                cx="180"
                cy="154"
                r="9"
                onClick={() => onSelect('codo_izq')}
                onMouseEnter={() => onHover('codo_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('codo_izq')}
              >
                <title>Codo Izquierdo</title>
              </circle>
              <rect
                x="60"
                y="166"
                width="16"
                height="38"
                rx="6"
                onClick={() => onSelect('antebrazo_flexores_der')}
                onMouseEnter={() => onHover('antebrazo_flexores_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('antebrazo_flexores_der')}
              >
                <title>Antebrazo Flexores Derecho</title>
              </rect>
              <rect
                x="178"
                y="166"
                width="16"
                height="38"
                rx="6"
                onClick={() => onSelect('antebrazo_flexores_izq')}
                onMouseEnter={() => onHover('antebrazo_flexores_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('antebrazo_flexores_izq')}
              >
                <title>Antebrazo Flexores Izquierdo</title>
              </rect>

              {/* --- MUÑECAS Y MANOS --- */}
              <circle
                cx="58"
                cy="214"
                r="10"
                onClick={() => onSelect('muneca_mano_der')}
                onMouseEnter={() => onHover('muneca_mano_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('muneca_mano_der')}
              >
                <title>Muñeca y Mano Derecha</title>
              </circle>
              <circle
                cx="196"
                cy="214"
                r="10"
                onClick={() => onSelect('muneca_mano_izq')}
                onMouseEnter={() => onHover('muneca_mano_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('muneca_mano_izq')}
              >
                <title>Muñeca y Mano Izquierda</title>
              </circle>

              {/* --- PECTORALES Y CORE --- */}
              <rect
                x="104"
                y="85"
                width="22"
                height="22"
                rx="5"
                onClick={() => onSelect('pectoral_mayor_der')}
                onMouseEnter={() => onHover('pectoral_mayor_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('pectoral_mayor_der')}
              >
                <title>Pectoral Derecho</title>
              </rect>
              <rect
                x="128"
                y="85"
                width="22"
                height="22"
                rx="5"
                onClick={() => onSelect('pectoral_mayor_izq')}
                onMouseEnter={() => onHover('pectoral_mayor_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('pectoral_mayor_izq')}
              >
                <title>Pectoral Izquierdo</title>
              </rect>
              <rect
                x="114"
                y="112"
                width="26"
                height="50"
                rx="6"
                onClick={() => onSelect('recto_abdominal')}
                onMouseEnter={() => onHover('recto_abdominal')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('recto_abdominal')}
              >
                <title>Recto Abdominal / Core</title>
              </rect>

              {/* --- PUBIS / INGLE --- */}
              <ellipse
                cx="127"
                cy="176"
                rx="16"
                ry="10"
                onClick={() => onSelect('pubis')}
                onMouseEnter={() => onHover('pubis')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('pubis')}
              >
                <title>Pubis / Pubalgia</title>
              </ellipse>

              {/* --- CUÁDRICEPS / MUSLO ANTERIOR --- */}
              <rect
                x="88"
                y="202"
                width="34"
                height="80"
                rx="8"
                onClick={() => onSelect('recto_femoral_der')}
                onMouseEnter={() => onHover('recto_femoral_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('recto_femoral_der')}
              >
                <title>Cuádriceps / Recto Femoral Derecho</title>
              </rect>
              <rect
                x="132"
                y="202"
                width="34"
                height="80"
                rx="8"
                onClick={() => onSelect('recto_femoral_izq')}
                onMouseEnter={() => onHover('recto_femoral_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('recto_femoral_izq')}
              >
                <title>Cuádriceps / Recto Femoral Izquierdo</title>
              </rect>

              {/* --- RODILLAS --- */}
              <circle
                cx="105"
                cy="295"
                r="13"
                onClick={() => onSelect('ligamento_cruzado_ant_der')}
                onMouseEnter={() => onHover('ligamento_cruzado_ant_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('ligamento_cruzado_ant_der')}
              >
                <title>Rodilla Derecha (LCA / Menisco)</title>
              </circle>
              <circle
                cx="150"
                cy="295"
                r="13"
                onClick={() => onSelect('ligamento_cruzado_ant_izq')}
                onMouseEnter={() => onHover('ligamento_cruzado_ant_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('ligamento_cruzado_ant_izq')}
              >
                <title>Rodilla Izquierda (LCA / Menisco)</title>
              </circle>

              {/* --- PIERNAS / ESPINILLAS --- */}
              <rect
                x="94"
                y="318"
                width="22"
                height="70"
                rx="6"
                onClick={() => onSelect('tibial_anterior_der')}
                onMouseEnter={() => onHover('tibial_anterior_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tibial_anterior_der')}
              >
                <title>Tibial Anterior Derecho</title>
              </rect>
              <rect
                x="138"
                y="318"
                width="22"
                height="70"
                rx="6"
                onClick={() => onSelect('tibial_anterior_izq')}
                onMouseEnter={() => onHover('tibial_anterior_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tibial_anterior_izq')}
              >
                <title>Tibial Anterior Izquierdo</title>
              </rect>

              {/* --- TOBILLOS Y PIES --- */}
              <circle
                cx="105"
                cy="400"
                r="10"
                onClick={() => onSelect('tobillo_der')}
                onMouseEnter={() => onHover('tobillo_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tobillo_der')}
              >
                <title>Tobillo Derecho</title>
              </circle>
              <circle
                cx="150"
                cy="400"
                r="10"
                onClick={() => onSelect('tobillo_izq')}
                onMouseEnter={() => onHover('tobillo_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tobillo_izq')}
              >
                <title>Tobillo Izquierdo</title>
              </circle>
            </svg>
          </div>
        )}

        {/* Vista Posterior */}
        {cameraView === 'posterior' && (
          <div className="relative w-[180px] sm:w-[205px] h-[370px] sm:h-[420px] flex items-center justify-center">
            {/* Imagen limpia sin textura horneada */}
            <img
              src="/models/avatar_back_clean_neutral.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/models/avatar_back_unlit.png';
              }}
              alt="Avatar Posterior"
              className="w-full h-full object-contain filter contrast-105 pointer-events-none"
            />
            <svg
              viewBox="0 0 255 495"
              className="absolute inset-0 w-full h-full z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* --- DELTOIDES POSTERIOR --- */}
              <circle
                cx="88"
                cy="92"
                r="14"
                onClick={() => onSelect('deltoides_post_der')}
                onMouseEnter={() => onHover('deltoides_post_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('deltoides_post_der')}
              >
                <title>Deltoides Posterior Derecho</title>
              </circle>
              <circle
                cx="166"
                cy="92"
                r="14"
                onClick={() => onSelect('deltoides_post_izq')}
                onMouseEnter={() => onHover('deltoides_post_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('deltoides_post_izq')}
              >
                <title>Deltoides Posterior Izquierdo</title>
              </circle>

              {/* --- TRÍCEPS BRAQUIAL --- */}
              <rect
                x="66"
                y="112"
                width="18"
                height="40"
                rx="7"
                onClick={() => onSelect('triceps_braquial_der')}
                onMouseEnter={() => onHover('triceps_braquial_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('triceps_braquial_der')}
              >
                <title>Tríceps Braquial Derecho</title>
              </rect>
              <rect
                x="170"
                y="112"
                width="18"
                height="40"
                rx="7"
                onClick={() => onSelect('triceps_braquial_izq')}
                onMouseEnter={() => onHover('triceps_braquial_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('triceps_braquial_izq')}
              >
                <title>Tríceps Braquial Izquierdo</title>
              </rect>

              {/* --- ESPALDA / DORSAL / LUMBAR --- */}
              <rect
                x="108"
                y="90"
                width="38"
                height="65"
                rx="6"
                onClick={() => onSelect('erectores_columna')}
                onMouseEnter={() => onHover('erectores_columna')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('erectores_columna')}
              >
                <title>Erectores de Columna / Lumbar</title>
              </rect>

              {/* --- GLÚTEOS --- */}
              <rect
                x="92"
                y="168"
                width="32"
                height="38"
                rx="8"
                onClick={() => onSelect('gluteo_der')}
                onMouseEnter={() => onHover('gluteo_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('gluteo_der')}
              >
                <title>Glúteo Derecho</title>
              </rect>
              <rect
                x="130"
                y="168"
                width="32"
                height="38"
                rx="8"
                onClick={() => onSelect('gluteo_izq')}
                onMouseEnter={() => onHover('gluteo_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('gluteo_izq')}
              >
                <title>Glúteo Izquierdo</title>
              </rect>

              {/* --- ISQUIOTIBIALES (POSTERIOR MUSLO) --- */}
              <rect
                x="88"
                y="214"
                width="36"
                height="80"
                rx="9"
                onClick={() => onSelect('isquiotibiales_der')}
                onMouseEnter={() => onHover('isquiotibiales_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('isquiotibiales_der')}
              >
                <title>Isquiotibiales Derecho</title>
              </rect>
              <rect
                x="130"
                y="214"
                width="36"
                height="80"
                rx="9"
                onClick={() => onSelect('isquiotibiales_izq')}
                onMouseEnter={() => onHover('isquiotibiales_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('isquiotibiales_izq')}
              >
                <title>Isquiotibiales Izquierdo</title>
              </rect>

              {/* --- GEMELOS / PANTORRILLA / SÓLEO --- */}
              <rect
                x="92"
                y="312"
                width="28"
                height="65"
                rx="7"
                onClick={() => onSelect('soleo_der')}
                onMouseEnter={() => onHover('soleo_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('soleo_der')}
              >
                <title>Pantorrilla / Sóleo Derecho</title>
              </rect>
              <rect
                x="134"
                y="312"
                width="28"
                height="65"
                rx="7"
                onClick={() => onSelect('soleo_izq')}
                onMouseEnter={() => onHover('soleo_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('soleo_izq')}
              >
                <title>Pantorrilla / Sóleo Izquierdo</title>
              </rect>

              {/* --- TENDÓN DE AQUILES Y TOBILLO POSTERIOR --- */}
              <rect
                x="100"
                y="384"
                width="12"
                height="30"
                rx="4"
                onClick={() => onSelect('tendon_aquiles_der')}
                onMouseEnter={() => onHover('tendon_aquiles_der')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tendon_aquiles_der')}
              >
                <title>Tendón de Aquiles Derecho</title>
              </rect>
              <rect
                x="142"
                y="384"
                width="12"
                height="30"
                rx="4"
                onClick={() => onSelect('tendon_aquiles_izq')}
                onMouseEnter={() => onHover('tendon_aquiles_izq')}
                onMouseLeave={() => onHover(null)}
                className={getZoneSvgClass('tendon_aquiles_izq')}
              >
                <title>Tendón de Aquiles Izquierdo</title>
              </rect>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
