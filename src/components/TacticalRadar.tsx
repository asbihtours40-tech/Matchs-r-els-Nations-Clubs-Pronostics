import React from 'react';
import { ClubIdentity, TeamDetailedStats } from '../types/football';

interface TacticalRadarProps {
  homeTeam: ClubIdentity;
  awayTeam: ClubIdentity;
  homeIndices: TeamDetailedStats['tacticalIndices'];
  awayIndices: TeamDetailedStats['tacticalIndices'];
}

const AXES: Array<{ key: keyof TeamDetailedStats['tacticalIndices']; label: string }> = [
  { key: 'attaque', label: 'Attaque' },
  { key: 'controle', label: 'Contrôle' },
  { key: 'pressing', label: 'Pressing' },
  { key: 'transition', label: 'Transition' },
  { key: 'coupsPiedsArretes', label: 'Coups arrêtés' },
  { key: 'defense', label: 'Défense' },
];

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  homeTeam,
  awayTeam,
  homeIndices,
  awayIndices,
}) => {
  const cx = 160;
  const cy = 148;
  const maxRadius = 96;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (indices: TeamDetailedStats['tacticalIndices']) =>
    AXES.map((axis, idx) => {
      const pt = getPoint(idx, indices[axis.key]);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 320 295"
        className="w-full max-w-[320px] h-auto"
        role="img"
        aria-label={`Radar tactique comparant ${homeTeam.shortName} et ${awayTeam.shortName}`}
      >
        {levels.map((level) => {
          const pts = AXES.map((_, idx) => {
            const pt = getPoint(idx, level);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray={level === 100 ? undefined : '2 2'}
            />
          );
        })}

        {AXES.map((axis, idx) => {
          const outer = getPoint(idx, 100);
          const labelPt = getPoint(idx, 122);
          return (
            <g key={axis.key}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10.5"
                fontWeight="600"
                fill="#475569"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={buildPolygonPoints(awayIndices)}
          fill="rgba(37, 99, 235, 0.14)"
          stroke="#2563EB"
          strokeWidth="2"
        />

        <polygon
          points={buildPolygonPoints(homeIndices)}
          fill="rgba(22, 163, 74, 0.18)"
          stroke="#15803D"
          strokeWidth="2.2"
        />

        {AXES.map((axis, idx) => {
          const ptHome = getPoint(idx, homeIndices[axis.key]);
          const ptAway = getPoint(idx, awayIndices[axis.key]);
          return (
            <g key={`${axis.key}-pts`}>
              <circle cx={ptAway.x} cy={ptAway.y} r="3" fill="#2563EB" />
              <circle cx={ptHome.x} cy={ptHome.y} r="3.2" fill="#15803D" />
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 mt-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 bg-emerald-700" aria-hidden="true" />
          <span className="font-semibold text-slate-900">{homeTeam.shortName}</span>
          <span className="text-slate-400">· Domicile</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 bg-blue-600" aria-hidden="true" />
          <span className="font-semibold text-slate-900">{awayTeam.shortName}</span>
          <span className="text-slate-400">· Extérieur</span>
        </div>
      </div>

      <div className="w-full mt-4 border-t border-slate-100 pt-3 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
        {AXES.map((axis) => (
          <div key={axis.key} className="flex items-center justify-between gap-2">
            <span className="text-slate-500 truncate">{axis.label}</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 whitespace-nowrap">
              <span className="text-emerald-700">{homeIndices[axis.key]}</span>
              <span className="text-slate-300 mx-0.5">/</span>
              <span className="text-blue-600">{awayIndices[axis.key]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
