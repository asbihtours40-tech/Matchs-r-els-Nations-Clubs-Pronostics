import React from 'react';
import { SavedPredictionPick } from '../types/football';
import { Trash2, ArrowRight } from 'lucide-react';

interface MyPredictionsViewProps {
  picks: SavedPredictionPick[];
  onUpdateStake: (id: string, stake: number) => void;
  onSetStatus: (id: string, status: SavedPredictionPick['status']) => void;
  onRemovePick: (id: string) => void;
  onClearAll: () => void;
  onGoToMatches: () => void;
}

export const MyPredictionsView: React.FC<MyPredictionsViewProps> = ({
  picks,
  onUpdateStake,
  onSetStatus,
  onRemovePick,
  onClearAll,
  onGoToMatches,
}) => {
  const totalStake = picks.reduce((sum, p) => sum + p.stake, 0);
  const potentialReturn = picks.reduce((sum, p) => sum + p.stake * p.odd, 0);
  const settledPicks = picks.filter((p) => p.status !== 'pending');
  const wonPicks = picks.filter((p) => p.status === 'won');
  const settledStake = settledPicks.reduce((sum, p) => sum + p.stake, 0);
  const settledReturn = wonPicks.reduce((sum, p) => sum + p.stake * p.odd, 0);
  const roiPct = settledStake > 0 ? ((settledReturn - settledStake) / settledStake) * 100 : 0;

  if (picks.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto my-8">
        <h2 className="text-lg font-bold text-slate-900">Aucun pronostic enregistré</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Parcourez les rencontres du jour et sélectionnez une cote (1N2, Plus/Moins 2,5 buts
          ou BTTS) pour suivre vos pronostics et calculer votre ROI simulé.
        </p>
        <button
          onClick={onGoToMatches}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
        >
          Voir les rencontres du jour
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Sélections actives</div>
          <div className="text-2xl font-mono tabular-nums font-bold text-slate-900 mt-1">
            {picks.length}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Mise totale engagée</div>
          <div className="text-2xl font-mono tabular-nums font-bold text-slate-900 mt-1">
            {totalStake.toFixed(0)} €
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Gains potentiels (simples)</div>
          <div className="text-2xl font-mono tabular-nums font-bold text-emerald-700 mt-1">
            {potentialReturn.toFixed(2)} €
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">ROI sur pronostics réglés</div>
          <div
            className={`text-2xl font-mono tabular-nums font-bold mt-1 ${
              roiPct > 0
                ? 'text-emerald-700'
                : roiPct < 0
                ? 'text-rose-700'
                : 'text-slate-900'
            }`}
          >
            {settledPicks.length > 0 ? `${roiPct > 0 ? '+' : ''}${roiPct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Historique & Suivi du coupon
          </h2>
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-rose-700 hover:text-rose-800 cursor-pointer"
          >
            Vider le coupon
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="py-3 px-4 font-medium">Rencontre</th>
                <th className="py-3 px-4 font-medium">Marché & Choix</th>
                <th className="py-3 px-3 font-medium text-right">Prob. Modèle</th>
                <th className="py-3 px-3 font-medium text-right">Cote</th>
                <th className="py-3 px-3 font-medium text-right">Mise (€)</th>
                <th className="py-3 px-3 font-medium text-right">Gain potentiel</th>
                <th className="py-3 px-4 font-medium">Statut simulé</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {picks.map((pick) => (
                <tr key={pick.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{pick.matchLabel}</div>
                    <div className="text-slate-500 mt-0.5">
                      {pick.leagueName} · {pick.kickoffLabel}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{pick.selection}</div>
                    <div className="text-slate-400">{pick.market}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {pick.modelProbPct.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {pick.odd.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={pick.stake}
                      onChange={(e) =>
                        onUpdateStake(pick.id, Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-20 px-2 py-1 text-right font-mono tabular-nums border border-slate-200 rounded bg-white text-slate-900"
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {(pick.stake * pick.odd).toFixed(2)} €
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={pick.status}
                      onChange={(e) =>
                        onSetStatus(
                          pick.id,
                          e.target.value as SavedPredictionPick['status']
                        )
                      }
                      className={`px-2 py-1 rounded border text-xs font-medium cursor-pointer ${
                        pick.status === 'won'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : pick.status === 'lost'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="pending">En attente</option>
                      <option value="won">Gagné</option>
                      <option value="lost">Perdu</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onRemovePick(pick.id)}
                      aria-label="Supprimer le pronostic"
                      className="p-1.5 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
