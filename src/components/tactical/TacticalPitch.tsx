'use client';

import React from 'react';
import type { TacticalBoardData, TacticalPlayer, TacticalArrow } from '@/types/exercises';

interface TacticalPitchProps {
  data?: TacticalBoardData;
  pitchType?: 'full' | 'half' | 'third';
  width?: number;
  height?: number;
  readOnly?: boolean;
  className?: string;
  showGrid?: boolean;
}

const TEAM_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  blue:   { fill: '#3b82f6', stroke: '#1d4ed8', text: '#fff' },
  red:    { fill: '#ef4444', stroke: '#b91c1c', text: '#fff' },
  yellow: { fill: '#facc15', stroke: '#a16207', text: '#000' },
  white:  { fill: '#ffffff', stroke: '#94a3b8', text: '#000' },
  green:  { fill: '#22c55e', stroke: '#15803d', text: '#fff' },
  orange: { fill: '#f97316', stroke: '#c2410c', text: '#fff' },
};

const CONE_COLORS: Record<string, string> = {
  yellow: '#facc15',
  red:    '#ef4444',
  orange: '#f97316',
  blue:   '#3b82f6',
};

// Coordenadas normalizadas: X ∈ [0,100], Y ∈ [0,70]
// ViewBox del SVG: 0 0 100 70
const VB_W = 100;
const VB_H = 70;

function PitchLines({ type }: { type: 'full' | 'half' | 'third' }) {
  const lineProps = { stroke: 'rgba(255,255,255,0.85)', strokeWidth: 0.4, fill: 'none' };
  const thinLine  = { ...lineProps, strokeWidth: 0.25 };

  if (type === 'full') {
    return (
      <g>
        {/* Franjas alternadas de césped */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 10} y={0} width={10} height={VB_H}
            fill={i % 2 === 0 ? '#16a34a' : '#15803d'} />
        ))}
        {/* Líneas de campo */}
        <rect x={2} y={2} width={96} height={66} {...lineProps} />
        {/* Línea central */}
        <line x1={50} y1={2} x2={50} y2={68} {...lineProps} />
        {/* Círculo central */}
        <circle cx={50} cy={35} r={9.15} {...lineProps} />
        <circle cx={50} cy={35} r={0.5} fill="white" />
        {/* Área grande izquierda */}
        <rect x={2} y={16.5} width={16.5} height={37} {...lineProps} />
        {/* Área pequeña izquierda */}
        <rect x={2} y={24.85} width={5.5} height={20.3} {...lineProps} />
        {/* Punto de penalti izquierdo */}
        <circle cx={13.5} cy={35} r={0.5} fill="white" />
        {/* Área grande derecha */}
        <rect x={81.5} y={16.5} width={16.5} height={37} {...lineProps} />
        {/* Área pequeña derecha */}
        <rect x={92.5} y={24.85} width={5.5} height={20.3} {...lineProps} />
        {/* Punto de penalti derecho */}
        <circle cx={86.5} cy={35} r={0.5} fill="white" />
        {/* Porterías */}
        <rect x={0} y={29.25} width={2} height={11.5} fill="none" stroke="white" strokeWidth={0.6} />
        <rect x={98} y={29.25} width={2} height={11.5} fill="none" stroke="white" strokeWidth={0.6} />
        {/* Bandas de córner */}
        <path d="M2,4 A2,2 0 0,1 4,2" {...thinLine} />
        <path d="M96,2 A2,2 0 0,1 98,4" {...thinLine} />
        <path d="M2,66 A2,2 0 0,0 4,68" {...thinLine} />
        <path d="M96,68 A2,2 0 0,0 98,66" {...thinLine} />
      </g>
    );
  }

  if (type === 'half') {
    return (
      <g>
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 10} y={0} width={10} height={VB_H}
            fill={i % 2 === 0 ? '#16a34a' : '#15803d'} />
        ))}
        <rect x={2} y={2} width={96} height={66} {...lineProps} />
        <line x1={50} y1={2} x2={50} y2={68} {...lineProps} />
        <circle cx={50} cy={35} r={9.15} {...lineProps} />
        <circle cx={50} cy={35} r={0.5} fill="white" />
        {/* Solo un área */}
        <rect x={2} y={16.5} width={16.5} height={37} {...lineProps} />
        <rect x={2} y={24.85} width={5.5} height={20.3} {...lineProps} />
        <circle cx={13.5} cy={35} r={0.5} fill="white" />
        <rect x={0} y={29.25} width={2} height={11.5} fill="none" stroke="white" strokeWidth={0.6} />
      </g>
    );
  }

  // third
  return (
    <g>
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * 10} y={0} width={10} height={VB_H}
          fill={i % 2 === 0 ? '#16a34a' : '#15803d'} />
      ))}
      <rect x={2} y={2} width={96} height={66} {...lineProps} />
      <rect x={2} y={16.5} width={30} height={37} {...lineProps} />
      <rect x={0} y={29.25} width={2} height={11.5} fill="none" stroke="white" strokeWidth={0.6} />
    </g>
  );
}

function PlayerMarker({ player }: { player: TacticalPlayer }) {
  const colors = TEAM_COLORS[player.team] || TEAM_COLORS.blue;
  const r = 3.2;
  return (
    <g transform={`translate(${player.x}, ${player.y})`}>
      {/* Sombra del jugador */}
      <ellipse cx={0.4} cy={2.2} rx={2.8} ry={1.2} fill="rgba(0,0,0,0.35)" />
      {/* Círculo del jugador con borde blanco nítido */}
      <circle r={r} fill={colors.fill} stroke="#ffffff" strokeWidth={0.8} />
      <circle r={r + 0.4} fill="none" stroke={colors.stroke} strokeWidth={0.4} opacity={0.8} />
      {/* Dorsal o Posición */}
      {player.label && (
        <text
          textAnchor="middle" dominantBaseline="central"
          fontSize={2.1} fontWeight="900" fill={colors.text}
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {player.label}
        </text>
      )}
    </g>
  );
}

function ConeMarker({ x, y, color = 'yellow' }: { x: number; y: number; color?: string }) {
  const fill = CONE_COLORS[color] || '#f97316';
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Sombra del cono */}
      <ellipse cx={0} cy={1.5} rx={2} ry={0.8} fill="rgba(0,0,0,0.35)" />
      {/* Base del cono */}
      <rect x={-1.8} y={0.8} width={3.6} height={0.9} rx={0.3} fill="#0f172a" />
      {/* Cuerpo cónico */}
      <polygon points={`0,-3 -1.5,1 1.5,1`} fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth={0.2} />
      {/* Franja reflectante */}
      <polygon points={`0,-0.8 -0.8,0.3 0.8,0.3`} fill="#ffffff" opacity={0.85} />
    </g>
  );
}

function PikeMarker({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx={0} cy={1.2} rx={1.2} ry={0.6} fill="rgba(0,0,0,0.3)" />
      <line x1={0} y1={-4.5} x2={0} y2={1.2} stroke="#ea580c" strokeWidth={0.9} strokeLinecap="round" />
      <circle cx={0} cy={-4.8} r={0.9} fill="#facc15" stroke="#ca8a04" strokeWidth={0.3} />
    </g>
  );
}

function BallMarker({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx={0.3} cy={1.2} rx={1.5} ry={0.7} fill="rgba(0,0,0,0.4)" />
      <circle r={1.6} fill="#ffffff" stroke="#0f172a" strokeWidth={0.35} />
      {/* Parche del balón */}
      <polygon points="0,-0.7 0.6,-0.2 0.4,0.6 -0.4,0.6 -0.6,-0.2" fill="#0f172a" />
    </g>
  );
}

function MiniGoalMarker({ x, y, rotation = 0 }: { x: number; y: number; rotation?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`}>
      {/* Red */}
      <rect x={-3.5} y={-1.8} width={7} height={3.6} fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth={0.5} strokeDasharray="0.8,0.6" rx={0.3} />
      {/* Poste frontal */}
      <line x1={-3.5} y1={1.8} x2={3.5} y2={1.8} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" />
      <circle cx={-3.5} cy={1.8} r={0.7} fill="#cbd5e1" />
      <circle cx={3.5} cy={1.8} r={0.7} fill="#cbd5e1" />
    </g>
  );
}

function ArrowMarker({ arrow }: { arrow: TacticalArrow }) {
  const isPass = arrow.type === 'pass';
  const isDribble = arrow.type === 'dribble';

  const dx = arrow.toX - arrow.fromX;
  const dy = arrow.toY - arrow.fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;

  // Acortar ligeramente el final para que la punta quede en el jugador
  const endX = arrow.toX - ux * 3.5;
  const endY = arrow.toY - uy * 3.5;

  // Punta de flecha
  const angle = Math.atan2(dy, dx);
  const arrowSize = 2;
  const ax1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const ay1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
  const ax2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const ay2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

  const color = isPass ? '#fde047' : isDribble ? '#c084fc' : '#34d399';
  const strokeWidth = isPass ? 0.8 : isDribble ? 0.9 : 0.8;

  const midX = (arrow.fromX + endX) / 2;
  const midY = (arrow.fromY + endY) / 2;

  const pathD = arrow.curved
    ? `M ${arrow.fromX},${arrow.fromY} Q ${midX - uy * 7},${midY + ux * 7} ${endX},${endY}`
    : `M ${arrow.fromX},${arrow.fromY} L ${endX},${endY}`;

  return (
    <g>
      <path
        d={pathD}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={isPass ? '2.5,1.5' : isDribble ? '1,1' : 'none'}
        fill="none"
        opacity={0.95}
      />
      <polygon
        points={`${endX},${endY} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={color}
        opacity={0.95}
      />
    </g>
  );
}

export function TacticalPitch({
  data,
  pitchType = 'full',
  width,
  height,
  className = '',
  showGrid = false,
}: TacticalPitchProps) {
  // Parse data if it comes as a string from JSONB column
  const parsedData: TacticalBoardData | undefined = typeof data === 'string'
    ? (() => { try { return JSON.parse(data as any); } catch { return undefined; } })()
    : data;

  const type = parsedData?.pitchType || pitchType;

  return (
    <div className={`relative bg-green-800 rounded-lg overflow-hidden select-none ${className}`}
      style={{ aspectRatio: '10/7' }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width={width || '100%'}
        height={height || '100%'}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Campo base */}
        <PitchLines type={type} />

        {/* Zonas de colores */}
        {Array.isArray(parsedData?.zones) && parsedData.zones.map(zone => (
          <rect
            key={zone.id}
            x={zone.x} y={zone.y}
            width={zone.width} height={zone.height}
            fill={zone.color || '#3b82f6'}
            opacity={zone.opacity ?? 0.15}
            rx={0.5}
          />
        ))}
        {Array.isArray(parsedData?.zones) && parsedData.zones.filter(z => z?.label).map(zone => (
          <text
            key={`lbl-${zone.id}`}
            x={zone.x + zone.width / 2} y={zone.y + zone.height / 2}
            textAnchor="middle" dominantBaseline="central"
            fontSize={2} fill="white" opacity={0.8} fontWeight="bold"
          >
            {zone.label}
          </text>
        ))}

        {/* Flechas (debajo de jugadores) */}
        {Array.isArray(parsedData?.arrows) && parsedData.arrows.map(arrow => (
          <ArrowMarker key={arrow.id} arrow={arrow} />
        ))}

        {/* Conos */}
        {Array.isArray(parsedData?.cones) && parsedData.cones.map(cone => (
          <ConeMarker key={cone.id} x={cone.x} y={cone.y} color={cone.color} />
        ))}

        {/* Picas */}
        {Array.isArray(parsedData?.pikes) && parsedData.pikes.map(pike => (
          <PikeMarker key={pike.id} x={pike.x} y={pike.y} />
        ))}

        {/* Mini-porterías */}
        {Array.isArray(parsedData?.miniGoals) && parsedData.miniGoals.map(goal => (
          <MiniGoalMarker key={goal.id} x={goal.x} y={goal.y} rotation={goal.rotation} />
        ))}

        {/* Balones */}
        {Array.isArray(parsedData?.balls) && parsedData.balls.map(ball => (
          <BallMarker key={ball.id} x={ball.x} y={ball.y} />
        ))}

        {/* Jugadores (encima de todo) */}
        {Array.isArray(parsedData?.players) && parsedData.players.map(player => (
          <PlayerMarker key={player.id} player={player} />
        ))}
      </svg>
    </div>
  );
}

export default TacticalPitch;
