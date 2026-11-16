import React, { useMemo, useState } from 'react';
import { CLUBS } from '../data/matchesData';
import { ClubIdentity, TeamCategory } from '../types/football';
import { computePoissonModel, formatOdd, formatPct } from '../utils/predictionEngine';
import { ClubCrest } from './ClubCrest';
import { PoissonMatrix } from './PoissonMatrix';
import { RotateCcw } from 'lucide-react';

interface SimulatorViewProps {
  teams?: ClubIdentity[];
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ teams }) => {
  const allTeams = useMemo(() => {
    const base = teams && teams.length >= 2 ? teams : Object.values(CLUBS);
    return base;
  }, [teams]);

  const [categoryFilter, setCategoryFilter] = useState<TeamCategory | 'all'>('all');

  const filteredTeams = useMemo(() => {
    if (categoryFilter === 'all') return allTeams;
    const list = allTeams.filter((t) => t.category === categoryFilter);
    return list.length >= 2 ? list : allTeams;
  }, [allTeams, categoryFilter]);

  const [homeKey, setHomeKey] = useState<string>('');
  const [awayKey, setAwayKey] = useState<string>('');
  const [homeAdvantage, setHomeAdvantage] = useState<number>(0.26);
  const [paceFactor, setPaceFactor] = useState<number>(1.0);
  const [homeFormMod, setHomeFormMod] = useState<number>(0);
  const [awayFormMod, setAwayFormMod] = useState<number>(0);

  const getTeamKey = (t: ClubIdentity) => `${t.category}-${t.id}`;

  const homeTeam = useMemo(() => {
    return (
      filteredTeams.find((t) => getTeamKey(t) === homeKey) ??
      filteredTeams[0]
    );
  }, [filteredTeams, homeKey]);

  const awayTeam = useMemo(() => {
    const found = filteredTeams.find((t) => getTeamKey(t) === awayKey);
    if (found && getTeamKey(found) !== getTeamKey(homeTeam)) return found;
    return filteredTeams.find((t) => getTeamKey(t) !== getTeamKey(homeTeam)) ?? filteredTeams[0];
  }, [filteredTeams, awayKey, homeTeam]);

  const { homeLambda, awayLambda, eloWinProb } = useMemo(() => {
    const eloDiff = homeTeam.elo - awayTeam.elo + (homeAdvantage > 0 ? 55 : 0);
    const eloProb = 1 / (1 + Math.pow(10, -eloDiff / 400));

    const baseAttackHome = 1.38 + (homeTeam.elo - 1820) / 240;
    const baseAttackAway = 1.24 + (awayTeam.elo - 1820) / 240;

    const defenseFactorAway = 1 - (awayTeam.elo - 1850) / 900;
    const defenseFactorHome = 1 - (homeTeam.elo - 1850) / 900;

    const rawHome =
      (baseAttackHome * defenseFactorAway + homeAdvantage) *
      paceFactor *
      (1 + homeFormMod / 100);
    const rawAway =
      baseAttackAway * defenseFactorHome * paceFactor * (1 + awayFormMod / 100);

    return {
      homeLambda: Math.max(0.35, Math.min(3.8, rawHome)),
      awayLambda: Math.max(0.3, Math.min(3.6, rawAway)),
      eloWinProb: eloProb,
    };
  }, [homeTeam, awayTeam, homeAdvantage, paceFactor, homeFormMod, awayFormMod]);

  const poisson = useMemo(
    () => computePoissonModel(homeLambda, awayLambda),
    [homeLambda, awayLambda]
  );

  const resetDefaults = () => {
    setHomeAdvantage(0.26);
    setPaceFactor(1.0);
    setHomeFormMod(0);
    setAwayFormMod(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Laboratoire de simulation Poisson & Elo
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Opposez n’importe quelles sélections nationales ou équipes de club issues du
              calendrier réel et ajustez les paramètres du modèle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Toutes' },
                  { id: 'nation', label: 'Nations' },
                  { id: 'club', label: 'Clubs' },
                ] as Array<{ id: TeamCategory | 'all'; label: string }>
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={resetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          <div className="lg:col-span-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Équipe A (Domicile)
                </label>
                <div className="flex items-center gap-2.5">
                  <ClubCrest club={homeTeam} size="sm" />
                  <select
                    value={getTeamKey(homeTeam)}
                    onChange={(e) => setHomeKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {filteredTeams.map((c) => {
                      const k = getTeamKey(c);
                      return (
                        <option key={k} value={k} disabled={k === getTeamKey(awayTeam)}>
                          {c.name} ({c.category === 'nation' ? 'Nation' : 'Club'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Équipe B (Extérieur)
                </label>
                <div className="flex items-center gap-2.5">
                  <ClubCrest club={awayTeam} size="sm" />
                  <select
                    value={getTeamKey(awayTeam)}
                    onChange={(e) => setAwayKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {filteredTeams.map((c) => {
                      const k = getTeamKey(c);
                      return (
                        <option key={k} value={k} disabled={k === getTeamKey(homeTeam)}>
                          {c.name} ({c.category === 'nation' ? 'Nation' : 'Club'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Avantage du terrain</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {homeAdvantage === 0
                      ? 'Terrain neutre (0.00)'
                      : `+${homeAdvantage.toFixed(2)} xG`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.04}
                  value={homeAdvantage}
                  onChange={(e) => setHomeAdvantage(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Rythme de la rencontre</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    ×{paceFactor.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.3}
                  step={0.05}
                  value={paceFactor}
                  onChange={(e) => setPaceFactor(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">
                    Forme / Absences {homeTeam.shortName}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    {homeFormMod > 0 ? '+' : ''}
                    {homeFormMod}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={5}
                  value={homeFormMod}
                  onChange={(e) => setHomeFormMod(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">
                    Forme / Absences {awayTeam.shortName}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-blue-700">
                    {awayFormMod > 0 ? '+' : ''}
                    {awayFormMod}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={5}
                  value={awayFormMod}
                  onChange={(e) => setAwayFormMod(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-5">
            <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Victoire {homeTeam.shortName}</div>
                <div className="text-2xl font-mono tabular-nums font-bold text-emerald-700 mt-1">
                  {formatPct(poisson.homeWinProb)}
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  Cote juste @{formatOdd(1 / poisson.homeWinProb)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Match Nul</div>
                <div className="text-2xl font-mono tabular-nums font-bold text-slate-800 mt-1">
                  {formatPct(poisson.drawProb)}
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  Cote juste @{formatOdd(1 / poisson.drawProb)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Victoire {awayTeam.shortName}</div>
                <div className="text-2xl font-mono tabular-nums font-bold text-blue-700 mt-1">
                  {formatPct(poisson.awayWinProb)}
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  Cote juste @{formatOdd(1 / poisson.awayWinProb)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500">xG attendus</span>
                <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5">
                  {homeLambda.toFixed(2)} – {awayLambda.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Score favori</span>
                <div className="font-mono tabular-nums font-bold text-emerald-700 text-sm mt-0.5">
                  {poisson.topScores[0]?.home} - {poisson.topScores[0]?.away} (
                  {formatPct(poisson.topScores[0]?.probability ?? 0)})
                </div>
              </div>
              <div>
                <span className="text-slate-500">Plus de 2,5 buts</span>
                <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5">
                  {formatPct(poisson.over25Prob)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Indice Elo relatif</span>
                <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5">
                  {formatPct(eloWinProb)} ({homeTeam.code})
                </div>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-200">
              <div
                style={{ width: `${poisson.homeWinProb * 100}%` }}
                className="bg-emerald-600 transition-all duration-150"
              />
              <div
                style={{ width: `${poisson.drawProb * 100}%` }}
                className="bg-slate-400 transition-all duration-150"
              />
              <div
                style={{ width: `${poisson.awayWinProb * 100}%` }}
                className="bg-blue-600 transition-all duration-150"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <PoissonMatrix homeTeam={homeTeam} awayTeam={awayTeam} poisson={poisson} />
      </div>
    </div>
  );
};
