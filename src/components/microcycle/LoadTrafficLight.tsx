'use client';

import React from 'react';

interface LoadTrafficLightProps {
  level: 1 | 2 | 3 | 4 | 5;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const LEVEL_CONFIG = {
  1: { label: 'Recuperación', color: '#22c55e', bg: '#dcfce7', border: '#16a34a', emoji: '🟢' },
  2: { label: 'Baja', color: '#84cc16', bg: '#f0fdf4', border: '#65a30d', emoji: '🟩' },
  3: { label: 'Media', color: '#f59e0b', bg: '#fffbeb', border: '#d97706', emoji: '🟡' },
  4: { label: 'Alta', color: '#f97316', bg: '#fff7ed', border: '#ea580c', emoji: '🟠' },
  5: { label: 'Máxima', color: '#ef4444', bg: '#fef2f2', border: '#dc2626', emoji: '🔴' },
};

const SIZE_CONFIG = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', gap: 'gap-1', padding: 'px-2 py-0.5' },
  md: { dot: 'w-3 h-3', text: 'text-sm', gap: 'gap-1.5', padding: 'px-3 py-1' },
  lg: { dot: 'w-4 h-4', text: 'text-base', gap: 'gap-2', padding: 'px-4 py-1.5' },
};

export function LoadTrafficLight({
  level,
  size = 'md',
  showLabel = true,
  className = '',
}: LoadTrafficLightProps) {
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeConfig.gap} ${sizeConfig.padding} ${className}`}
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}`, color: config.color }}
      title={`Carga: ${config.label} (Nivel ${level}/5)`}
    >
      <span
        className={`rounded-full flex-shrink-0 ${sizeConfig.dot}`}
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className={sizeConfig.text}>{config.emoji} {config.label}</span>
      )}
      {!showLabel && (
        <span className={sizeConfig.text}>{level}</span>
      )}
    </span>
  );
}

export function LoadBars({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex items-end gap-0.5" title={`Intensidad ${level}/5`}>
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className="w-1.5 rounded-sm transition-all"
          style={{
            height: `${bar * 4}px`,
            backgroundColor: bar <= level
              ? bar <= 2 ? '#22c55e' : bar <= 3 ? '#f59e0b' : bar <= 4 ? '#f97316' : '#ef4444'
              : '#e2e8f0',
          }}
        />
      ))}
    </div>
  );
}

export default LoadTrafficLight;
