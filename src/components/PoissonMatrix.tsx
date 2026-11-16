import React, { useState } from 'react';
import { ClubIdentity, PoissonOutput } from '../types/football';
import { formatOdd, formatPct } from '../utils/predictionEngine';

interface PoissonMatrixProps {
  homeTeam: ClubIdentity;
  awayTeam: ClubIdentity;
  poisson: PoissonOutput;
  onSelectScore?: (home: number, away: number, prob: number) => void;
}

export const PoissonMatrix: React.FC<PoissonMatrixProps> = ({
  homeTeam,
  awayTeam,
  poisson,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ h: number; a: number; prob: number } | null>(null);

  const maxProb = Math.max(...poisson.matrix.flat());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Matrice des scores exacts (Loi de Poisson)
            </h4>
            <p className="text-xs text-slate-500">
              Lignes : buts {homeTeam.shortName} · Colonnes : buts {awayTeam.shortName}
            </p>
          </div>
          {hoveredCell ? (
            <div className="text-right font-mono tabular-nums text-xs">
              <span className="font-semibold text-slate-900">
                Score {hoveredCell.h}-{hoveredCell.a}
              </span>
              <span className="text-slate-400 mx-1.5">·</span>
              <span className="text-emerald-700 font-semibold">{formatPct(hoveredCell.prob)}</span>
              <span className="text-slate-400 mx-1.5">·</span>
              <span className="text-slate-600">
                Cote juste {hoveredCell.prob > 0.005 ? formatOdd(1 / hoveredCell.prob) : '—'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Survolez une case pour le détail</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center font-mono tabular-nums text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-[11px] font-medium text-slate-400 border-b border-slate-200">
                  {homeTeam.code} \ {awayTeam.code}
                </th>
                {[0, 1, 2, 3, 4].map((a) => (
                  <th
                    key={a}
                    className="p-2 font-semibold text-slate-600 border-b border-slate-200"
                  >
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {poisson.matrix.map((row, h) => (
                <tr key={h}>
                  <td className="p-2 text-left font-semibold text-slate-600 border-r border-slate-200">
                    {h}
                  </td>
                  {row.map((prob, a) => {
                    const intensity = maxProb > 0 ? prob / maxProb : 0;
                    const isTop =
                      poisson.topScores[0]?.home === h && poisson.topScores[0]?.away === a;
                    const bgOpacity = Math.max(0.03, Math.min(0.88, intensity * 0.85));
                    const isDarkCell = intensity > 0.58;

                    return (
                      <td
                        key={`${h}-${a}`}
                        onMouseEnter={() => setHoveredCell({ h, a, prob })}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          backgroundColor: `rgba(21, 128, 61, ${bgOpacity.toFixed(2)})`,
                        }}
                        className={`p-2.5 border border-white transition-transform duration-150 cursor-default ${
                          isDarkCell ? 'text-white font-semibold' : 'text-slate-800'
                        } ${isTop ? 'ring-2 ring-slate-900 ring-inset' : ''}`}
                      >
                        {(prob * 100).toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
            Scores exacts les plus probables
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
            {poisson.topScores.slice(0, 5).map((score, idx) => (
              <div
                key={`${score.home}-${score.away}`}
                className="flex items-center justify-between px-3.5 py-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-slate-400 w-4">0{idx + 1}.</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                    {score.home} - {score.away}
                  </span>
                  <span className="text-slate-500">
                    {score.home > score.away
                      ? homeTeam.shortName
                      : score.home < score.away
                      ? awayTeam.shortName
                      : 'Match nul'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="font-semibold text-emerald-700">
                    {formatPct(score.probability)}
                  </span>
                  <span className="text-slate-400">@{formatOdd(score.fairOdd)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
            Marchés dérivés du modèle
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white text-xs">
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Plus de 1,5 buts</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.over15Prob)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Plus de 2,5 buts</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.over25Prob)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Plus de 3,5 buts</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.over35Prob)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Les deux équipes marquent (Oui)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.bttsYesProb)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Double chance {homeTeam.code} ou Nul</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.doubleChance1N)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-slate-600">Double chance Nul ou {awayTeam.code}</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatPct(poisson.doubleChanceN2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
