import React, { useMemo, useState } from 'react';
import { FootballMatch, SavedPredictionPick } from '../types/football';
import { computePoissonModel, formatOdd, formatPct } from '../utils/predictionEngine';
import { ClubCrest } from './ClubCrest';
import { PoissonMatrix } from './PoissonMatrix';
import { TacticalRadar } from './TacticalRadar';
import { Plus, Check, RotateCcw } from 'lucide-react';

interface MatchDetailPanelProps {
  match: FootballMatch;
  isLoadingDetail?: boolean;
  savedPicks: SavedPredictionPick[];
  onAddPick: (pick: Omit<SavedPredictionPick, 'id' | 'createdAt' | 'status'>) => void;
}

type DetailTab = 'pronostic' | 'stats' | 'forme' | 'effectifs';

interface StatRowDef {
  label: string;
  homeVal: number;
  awayVal: number;
  unit?: string;
  decimals?: number;
  lowerIsBetter?: boolean;
}

export const MatchDetailPanel: React.FC<MatchDetailPanelProps> = ({
  match,
  isLoadingDetail = false,
  savedPicks,
  onAddPick,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('pronostic');
  const [homeDelta, setHomeDelta] = useState<number>(0);
  const [awayDelta, setAwayDelta] = useState<number>(0);

  const adjustedHomeLambda = Math.max(
    0.3,
    match.predictionSummary.expectedHomeGoals * (1 + homeDelta / 100)
  );
  const adjustedAwayLambda = Math.max(
    0.25,
    match.predictionSummary.expectedAwayGoals * (1 + awayDelta / 100)
  );

  const poisson = useMemo(
    () => computePoissonModel(adjustedHomeLambda, adjustedAwayLambda, match.odds),
    [adjustedHomeLambda, adjustedAwayLambda, match.odds]
  );

  const isPickInSlip = (market: string, selection: string) =>
    savedPicks.some(
      (p) => p.matchId === match.id && p.market === market && p.selection === selection
    );

  const handleQuickAdd = (
    market: string,
    selection: string,
    odd: number,
    prob: number
  ) => {
    onAddPick({
      matchId: match.id,
      matchLabel: `${match.homeTeam.shortName} - ${match.awayTeam.shortName}`,
      leagueName: match.leagueName,
      kickoffLabel: `${match.displayDate} · ${match.displayTime}`,
      market,
      selection,
      odd,
      modelProbPct: Number((prob * 100).toFixed(1)),
      stake: 20,
    });
  };

  const statRows: StatRowDef[] = [
    {
      label: 'Buts attendus estimés (xG / match)',
      homeVal: match.homeStats.xgPerMatch,
      awayVal: match.awayStats.xgPerMatch,
      decimals: 2,
    },
    {
      label: 'Buts concédés estimés (xGA)',
      homeVal: match.homeStats.xgaPerMatch,
      awayVal: match.awayStats.xgaPerMatch,
      decimals: 2,
      lowerIsBetter: true,
    },
    {
      label: 'Possession moyenne',
      homeVal: match.homeStats.possessionAvg,
      awayVal: match.awayStats.possessionAvg,
      unit: '%',
      decimals: 1,
    },
    {
      label: 'Tirs par match',
      homeVal: match.homeStats.shotsPerMatch,
      awayVal: match.awayStats.shotsPerMatch,
      decimals: 1,
    },
    {
      label: 'Tirs cadrés par match',
      homeVal: match.homeStats.shotsOnTargetPerMatch,
      awayVal: match.awayStats.shotsOnTargetPerMatch,
      decimals: 1,
    },
    {
      label: 'Grosses occasions créées / match',
      homeVal: match.homeStats.bigChancesCreatedPerMatch,
      awayVal: match.awayStats.bigChancesCreatedPerMatch,
      decimals: 1,
    },
    {
      label: 'PPDA (Intensité du pressing)',
      homeVal: match.homeStats.ppda,
      awayVal: match.awayStats.ppda,
      decimals: 1,
      lowerIsBetter: true,
    },
    {
      label: 'xG sur coups de pied arrêtés',
      homeVal: match.homeStats.setPieceXgPerMatch,
      awayVal: match.awayStats.setPieceXgPerMatch,
      decimals: 2,
    },
    {
      label: 'Clean sheets',
      homeVal: match.homeStats.cleanSheetPct,
      awayVal: match.awayStats.cleanSheetPct,
      unit: '%',
      decimals: 0,
    },
    {
      label: 'Corners obtenus / match',
      homeVal: match.homeStats.cornersPerMatch,
      awayVal: match.awayStats.cornersPerMatch,
      decimals: 1,
    },
  ];

  const primaryMarketButtons = [
    {
      market: '1N2',
      selection: `Victoire ${match.homeTeam.shortName}`,
      shortLabel: `1 (${match.homeTeam.code})`,
      odd: match.odds.home,
      prob: poisson.homeWinProb,
    },
    {
      market: '1N2',
      selection: 'Match Nul',
      shortLabel: 'Nul (N)',
      odd: match.odds.draw,
      prob: poisson.drawProb,
    },
    {
      market: '1N2',
      selection: `Victoire ${match.awayTeam.shortName}`,
      shortLabel: `2 (${match.awayTeam.code})`,
      odd: match.odds.away,
      prob: poisson.awayWinProb,
    },
    {
      market: 'Total Buts',
      selection: 'Plus de 2,5 buts',
      shortLabel: '+2,5 buts',
      odd: match.odds.over25,
      prob: poisson.over25Prob,
    },
    {
      market: 'BTTS',
      selection: 'Les deux marquent — Oui',
      shortLabel: 'BTTS Oui',
      odd: match.odds.bttsYes,
      prob: poisson.bttsYesProb,
    },
  ];

  const renderOutcomeBadge = (outcome: 'V' | 'N' | 'D') => {
    const colorClass =
      outcome === 'V'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : outcome === 'N'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-rose-700 bg-rose-50 border-rose-200';
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold rounded border ${colorClass}`}
      >
        {outcome}
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Match Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{match.leagueName}</span>
            <span aria-hidden="true">·</span>
            <span>{match.category === 'nation' ? 'Sélections nationales' : 'Clubs'}</span>
            <span aria-hidden="true">·</span>
            <span>{match.matchday}</span>
            {match.stadium && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {match.stadium}
                  {match.city ? `, ${match.city}` : ''}
                </span>
              </>
            )}
            {isLoadingDetail && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">
                  Actualisation des statistiques...
                </span>
              </>
            )}
          </div>
          <div className="font-mono tabular-nums font-medium text-slate-700">
            {match.status === 'live'
              ? `En direct · ${match.liveClock ?? 'En cours'}`
              : `${match.displayDate} · ${match.displayTime}`}
          </div>
        </div>

        {/* Teams & Score/xG Strip */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
          <div className="md:col-span-4 flex items-center gap-4">
            <ClubCrest club={match.homeTeam} size="lg" />
            <div className="min-w-0">
              <div className="text-xs text-slate-500 mb-0.5">
                {match.homeStats.wins}V {match.homeStats.draws}N {match.homeStats.losses}D ·
                Elo {match.homeTeam.elo}
              </div>
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {match.homeTeam.name}
              </h2>
              {match.homeStats.recentForm.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {match.homeStats.recentForm.slice(0, 5).map((r, i) => (
                    <React.Fragment key={i}>{renderOutcomeBadge(r.outcome)}</React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col items-center justify-center py-2 border-y md:border-y-0 md:border-x border-slate-100">
            {(match.status === 'finished' || match.status === 'live') && match.finalScore ? (
              <>
                <span className="text-xs font-medium text-slate-500 mb-1">
                  {match.status === 'live' ? `En cours (${match.liveClock})` : 'Score final'}
                </span>
                <div className="text-3xl font-mono tabular-nums font-bold text-slate-900 tracking-tight">
                  {match.finalScore.home} - {match.finalScore.away}
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                  xG estimés : {match.finalScore.actualHomeXg.toFixed(2)} –{' '}
                  {match.finalScore.actualAwayXg.toFixed(2)}
                </div>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-slate-500 mb-1">
                  Buts attendus (Modèle)
                </span>
                <div className="text-2xl font-mono tabular-nums font-bold text-slate-900">
                  {poisson.homeLambda.toFixed(2)} <span className="text-slate-300">:</span>{' '}
                  {poisson.awayLambda.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Score favori :{' '}
                  <span className="font-mono font-semibold text-emerald-700">
                    {poisson.topScores[0]?.home}-{poisson.topScores[0]?.away}
                  </span>{' '}
                  ({formatPct(poisson.topScores[0]?.probability ?? 0)})
                </div>
              </>
            )}
          </div>

          <div className="md:col-span-4 flex items-center md:justify-end gap-4">
            <div className="min-w-0 md:text-right order-2 md:order-1">
              <div className="text-xs text-slate-500 mb-0.5">
                {match.awayStats.wins}V {match.awayStats.draws}N {match.awayStats.losses}D ·
                Elo {match.awayTeam.elo}
              </div>
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {match.awayTeam.name}
              </h2>
              {match.awayStats.recentForm.length > 0 && (
                <div className="flex items-center md:justify-end gap-1.5 mt-2">
                  {match.awayStats.recentForm.slice(0, 5).map((r, i) => (
                    <React.Fragment key={i}>{renderOutcomeBadge(r.outcome)}</React.Fragment>
                  ))}
                </div>
              )}
            </div>
            <div className="order-1 md:order-2">
              <ClubCrest club={match.awayTeam} size="lg" />
            </div>
          </div>
        </div>

        {/* Quick 1N2 Probability Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1.5">
            <span className="font-semibold text-emerald-700">
              {match.homeTeam.shortName} {formatPct(poisson.homeWinProb)}
            </span>
            <span className="text-slate-500">Nul {formatPct(poisson.drawProb)}</span>
            <span className="font-semibold text-blue-700">
              {match.awayTeam.shortName} {formatPct(poisson.awayWinProb)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
            <div
              style={{ width: `${poisson.homeWinProb * 100}%` }}
              className="bg-emerald-600 transition-all duration-200"
            />
            <div
              style={{ width: `${poisson.drawProb * 100}%` }}
              className="bg-slate-400 transition-all duration-200"
            />
            <div
              style={{ width: `${poisson.awayWinProb * 100}%` }}
              className="bg-blue-600 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-slate-200 bg-slate-50/60 flex items-center gap-1 overflow-x-auto">
        {(
          [
            { id: 'pronostic', label: 'Pronostic & Poisson' },
            { id: 'stats', label: 'Statistiques avancées' },
            { id: 'forme', label: 'Forme & Confrontations' },
            { id: 'effectifs', label: 'Joueurs & Scénario' },
          ] as Array<{ id: DetailTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'pronostic' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-500">
                    Recommandation principale · Marché {match.predictionSummary.primaryMarket}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700">
                    Indice de confiance : {match.predictionSummary.confidencePct}%
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  {match.predictionSummary.primaryPickLabel}
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {match.predictionSummary.rationale.map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs text-slate-400 mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
                    Cotes du marché & Sélection rapide
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                    {primaryMarketButtons.map((btn) => {
                      const added = isPickInSlip(btn.market, btn.selection);
                      const edge = (btn.odd * btn.prob - 1) * 100;
                      return (
                        <button
                          key={btn.shortLabel}
                          onClick={() =>
                            handleQuickAdd(btn.market, btn.selection, btn.odd, btn.prob)
                          }
                          disabled={match.status === 'finished'}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            added
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                              : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-medium truncate">
                              {btn.shortLabel}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-slate-500">
                              Modèle {formatPct(btn.prob, 0)}
                              {edge > 2 && (
                                <span className="text-emerald-700 font-semibold ml-1">
                                  (+{edge.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono tabular-nums font-bold text-sm">
                              {formatOdd(btn.odd)}
                            </span>
                            {added ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Analyse Value (Écart modèle vs cote)
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {poisson.valueOpportunities.slice(0, 3).map((opp) => (
                      <div
                        key={opp.selection}
                        className="flex items-center justify-between text-slate-600"
                      >
                        <span className="truncate pr-2">{opp.selection}</span>
                        <span
                          className={`font-mono tabular-nums font-semibold whitespace-nowrap ${
                            opp.edgePct > 0 ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {opp.edgePct > 0 ? '+' : ''}
                          {opp.edgePct.toFixed(1)}% · @{formatOdd(opp.marketOdd)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <PoissonMatrix
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                poisson={poisson}
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {match.boxscoreStats && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/70">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Statistiques officielles de la rencontre ({match.status === 'live' ? 'En direct' : 'Score final'})
                  </h4>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {match.homeTeam.code} vs {match.awayTeam.code}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-slate-500">Possession</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1">
                      {match.boxscoreStats.possessionHome.toFixed(0)}% –{' '}
                      {match.boxscoreStats.possessionAway.toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-slate-500">Tirs (Cadrés)</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1">
                      {match.boxscoreStats.shotsHome} ({match.boxscoreStats.shotsOnTargetHome}) –{' '}
                      {match.boxscoreStats.shotsAway} ({match.boxscoreStats.shotsOnTargetAway})
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-slate-500">Corners · Fautes</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1">
                      {match.boxscoreStats.cornersHome}-{match.boxscoreStats.cornersAway} ·{' '}
                      {match.boxscoreStats.foulsHome}-{match.boxscoreStats.foulsAway}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-slate-500">Passes (Précision)</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1">
                      {match.boxscoreStats.passesHome} ({match.boxscoreStats.passAccuracyHome}%) –{' '}
                      {match.boxscoreStats.passesAway} ({match.boxscoreStats.passAccuracyAway}%)
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <span>{match.homeTeam.shortName} (Dom.)</span>
                  <span className="text-slate-400 font-normal">
                    Profil statistique comparé
                  </span>
                  <span>{match.awayTeam.shortName} (Ext.)</span>
                </div>

                <div className="space-y-4">
                  {statRows.map((row) => {
                    const total = row.homeVal + row.awayVal;
                    const homeShare = total > 0 ? (row.homeVal / total) * 100 : 50;
                    const homeBetter = row.lowerIsBetter
                      ? row.homeVal < row.awayVal
                      : row.homeVal > row.awayVal;
                    const awayBetter = row.lowerIsBetter
                      ? row.awayVal < row.homeVal
                      : row.awayVal > row.homeVal;

                    return (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-mono tabular-nums w-16 ${
                              homeBetter ? 'font-bold text-emerald-700' : 'text-slate-700'
                            }`}
                          >
                            {row.homeVal.toFixed(row.decimals ?? 1)}
                            {row.unit ?? ''}
                          </span>
                          <span className="text-slate-600 font-medium text-center px-2">
                            {row.label}
                          </span>
                          <span
                            className={`font-mono tabular-nums w-16 text-right ${
                              awayBetter ? 'font-bold text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            {row.awayVal.toFixed(row.decimals ?? 1)}
                            {row.unit ?? ''}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${homeShare}%` }}
                            className="bg-emerald-600"
                          />
                          <div
                            style={{ width: `${100 - homeShare}%` }}
                            className="bg-blue-600"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 border border-slate-200 rounded-lg p-5 bg-slate-50/40">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  Profil tactique comparé
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Indices normalisés sur 100 d’après les résultats récents et la dynamique
                </p>
                <TacticalRadar
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  homeIndices={match.homeStats.tacticalIndices}
                  awayIndices={match.awayStats.tacticalIndices}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forme' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {match.homeTeam.name}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                    {match.homeStats.homeOrAwaySplitRecord}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-slate-500">xG estimés / match</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-base">
                      {match.homeStats.xgPerMatch.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">xGA estimés / match</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-base">
                      {match.homeStats.xgaPerMatch.toFixed(2)}
                    </div>
                  </div>
                </div>
                {match.homeStats.recentForm.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Historique des 5 derniers matchs en cours de consolidation pour cette équipe.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {match.homeStats.recentForm.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-2 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {renderOutcomeBadge(item.outcome)}
                          <span className="text-slate-400 font-mono w-14 shrink-0">
                            {item.date}
                          </span>
                          <span className="font-medium text-slate-800 truncate">
                            {item.isHome ? 'vs' : '@'} {item.opponent}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                          <span className="font-bold text-slate-900">
                            {item.goalsFor}-{item.goalsAgainst}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {match.awayTeam.name}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                    {match.awayStats.homeOrAwaySplitRecord}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-slate-500">xG estimés / match</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-base">
                      {match.awayStats.xgPerMatch.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">xGA estimés / match</span>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-base">
                      {match.awayStats.xgaPerMatch.toFixed(2)}
                    </div>
                  </div>
                </div>
                {match.awayStats.recentForm.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Historique des 5 derniers matchs en cours de consolidation pour cette équipe.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {match.awayStats.recentForm.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-2 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {renderOutcomeBadge(item.outcome)}
                          <span className="text-slate-400 font-mono w-14 shrink-0">
                            {item.date}
                          </span>
                          <span className="font-medium text-slate-800 truncate">
                            {item.isHome ? 'vs' : '@'} {item.opponent}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                          <span className="font-bold text-slate-900">
                            {item.goalsFor}-{item.goalsAgainst}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Confrontations directes (H2H)
                </h4>
                {match.h2hSummary.recentMeetings.length > 0 && (
                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                    <span className="text-emerald-700 font-semibold">
                      {match.homeTeam.shortName} : {match.h2hSummary.homeWins}V
                    </span>
                    <span className="text-slate-500">Nuls : {match.h2hSummary.draws}</span>
                    <span className="text-blue-700 font-semibold">
                      {match.awayTeam.shortName} : {match.h2hSummary.awayWins}V
                    </span>
                  </div>
                )}
              </div>
              {match.h2hSummary.recentMeetings.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  Aucune confrontation directe récente enregistrée dans la série actuelle de la
                  compétition.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="py-2.5 px-4 font-medium">Date</th>
                        <th className="py-2.5 px-4 font-medium">Compétition</th>
                        <th className="py-2.5 px-4 font-medium">Affiche</th>
                        <th className="py-2.5 px-4 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {match.h2hSummary.recentMeetings.map((h2h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 text-slate-500 font-mono tabular-nums whitespace-nowrap">
                            {h2h.date}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{h2h.competition}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {h2h.homeTeam} – {h2h.awayTeam}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                            {h2h.homeGoals} - {h2h.awayGoals}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'effectifs' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Joueurs à suivre · {match.homeTeam.shortName}
                </h4>
                {match.homeKeyPlayers.length === 0 ? (
                  <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3.5">
                    Les statistiques individuelles seront disponibles à l’approche du coup d’envoi.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {match.homeKeyPlayers.map((player) => (
                      <div
                        key={player.name}
                        className="px-4 py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{player.name}</span>
                          <span className="text-slate-400 ml-2">{player.position}</span>
                          <div className="text-slate-500 mt-0.5 font-mono tabular-nums">
                            {player.goals} buts · {player.assists} passes déc. ·{' '}
                            {player.xgPer90.toFixed(2)} xG/90
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-bold text-emerald-700">
                            {player.anytimeGoalProb}%
                          </div>
                          <div className="text-[11px] text-slate-400">buteur</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Joueurs à suivre · {match.awayTeam.shortName}
                </h4>
                {match.awayKeyPlayers.length === 0 ? (
                  <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3.5">
                    Les statistiques individuelles seront disponibles à l’approche du coup d’envoi.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {match.awayKeyPlayers.map((player) => (
                      <div
                        key={player.name}
                        className="px-4 py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{player.name}</span>
                          <span className="text-slate-400 ml-2">{player.position}</span>
                          <div className="text-slate-500 mt-0.5 font-mono tabular-nums">
                            {player.goals} buts · {player.assists} passes déc. ·{' '}
                            {player.xgPer90.toFixed(2)} xG/90
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-bold text-blue-700">
                            {player.anytimeGoalProb}%
                          </div>
                          <div className="text-[11px] text-slate-400">buteur</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Simulateur de scénario sur la rencontre
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ajustez le potentiel offensif de chaque équipe pour tester l’impact d’un
                    forfait ou d’une rotation d’effectif.
                  </p>
                </div>
                {(homeDelta !== 0 || awayDelta !== 0) && (
                  <button
                    onClick={() => {
                      setHomeDelta(0);
                      setAwayDelta(0);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">
                      Intensité offensive {match.homeTeam.shortName}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      {homeDelta > 0 ? '+' : ''}
                      {homeDelta}% ({adjustedHomeLambda.toFixed(2)} xG)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    step={5}
                    value={homeDelta}
                    onChange={(e) => setHomeDelta(Number(e.target.value))}
                    className="w-full accent-emerald-700 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">
                      Intensité offensive {match.awayTeam.shortName}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-blue-700">
                      {awayDelta > 0 ? '+' : ''}
                      {awayDelta}% ({adjustedAwayLambda.toFixed(2)} xG)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    step={5}
                    value={awayDelta}
                    onChange={(e) => setAwayDelta(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
