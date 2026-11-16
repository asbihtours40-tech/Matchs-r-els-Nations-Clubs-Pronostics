import React, { useEffect, useMemo, useState } from 'react';
import { FALLBACK_STANDINGS } from '../data/matchesData';
import { LeagueId, LeagueStandingRow } from '../types/football';
import { ClubCrest } from './ClubCrest';
import { ArrowUpDown } from 'lucide-react';

type StandingsLeague = Exclude<LeagueId, 'fifa-friendly' | 'champions-league'>;
type SortKey = 'points' | 'xpts' | 'xg' | 'xga';

const LEAGUE_TABS: Array<{ id: StandingsLeague; label: string }> = [
  { id: 'uefa-nations', label: 'Ligue des Nations' },
  { id: 'ligue-1', label: "Ligue 1 McDonald's" },
  { id: 'premier-league', label: 'Premier League' },
  { id: 'la-liga', label: 'LaLiga EA Sports' },
  { id: 'serie-a', label: 'Serie A' },
  { id: 'bundesliga', label: 'Bundesliga' },
];

export const StandingsView: React.FC = () => {
  const [selectedLeague, setSelectedLeague] = useState<StandingsLeague>('uefa-nations');
  const [sortBy, setSortBy] = useState<SortKey>('points');
  const [rows, setRows] = useState<LeagueStandingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/standings/${selectedLeague}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.rows && Array.isArray(data.rows) && data.rows.length > 0) {
          setRows(data.rows);
        } else {
          setRows(FALLBACK_STANDINGS[selectedLeague] ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setRows(FALLBACK_STANDINGS[selectedLeague] ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLeague]);

  const groupedSections = useMemo(() => {
    const hasGroups = rows.some((r) => Boolean(r.groupName));
    if (!hasGroups) {
      const sorted = [...rows].sort((a, b) =>
        sortBy === 'xga' ? a.xga - b.xga : b[sortBy] - a[sortBy]
      );
      return [{ groupName: undefined, items: sorted }];
    }

    const map = new Map<string, LeagueStandingRow[]>();
    for (const r of rows) {
      const key = r.groupName ?? 'Classement général';
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }

    return Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items: [...items].sort((a, b) =>
        sortBy === 'xga' ? a.xga - b.xga : b[sortBy] - a[sortBy]
      ),
    }));
  }, [rows, sortBy]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Classements officiels & Indicateurs xPTS
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Classements réels (Nations et Clubs) comparés aux points attendus (xPTS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {LEAGUE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLeague(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedLeague === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-9 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : groupedSections.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Aucun classement disponible pour cette compétition pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {groupedSections.map((sec) => (
            <div key={sec.groupName ?? 'main'}>
              {sec.groupName && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  {sec.groupName}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                      <th className="py-3 px-4 font-medium w-10">#</th>
                      <th className="py-3 px-4 font-medium">Équipe</th>
                      <th className="py-3 px-3 font-medium text-right">MJ</th>
                      <th className="py-3 px-3 font-medium text-right">V</th>
                      <th className="py-3 px-3 font-medium text-right">N</th>
                      <th className="py-3 px-3 font-medium text-right">D</th>
                      <th className="py-3 px-3 font-medium text-right">BP / BC</th>
                      <th className="py-3 px-3 font-medium text-right">
                        <button
                          onClick={() => setSortBy('xg')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            sortBy === 'xg'
                              ? 'text-emerald-700 font-semibold'
                              : 'hover:text-slate-800'
                          }`}
                        >
                          xG <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium text-right">
                        <button
                          onClick={() => setSortBy('xga')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            sortBy === 'xga'
                              ? 'text-emerald-700 font-semibold'
                              : 'hover:text-slate-800'
                          }`}
                        >
                          xGA <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium text-right">
                        <button
                          onClick={() => setSortBy('xpts')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            sortBy === 'xpts'
                              ? 'text-emerald-700 font-semibold'
                              : 'hover:text-slate-800'
                          }`}
                        >
                          xPTS <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3 font-medium text-right">Écart</th>
                      <th className="py-3 px-4 font-medium text-right">
                        <button
                          onClick={() => setSortBy('points')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            sortBy === 'points'
                              ? 'text-emerald-700 font-semibold'
                              : 'hover:text-slate-800'
                          }`}
                        >
                          Pts <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sec.items.map((row, idx) => {
                      const delta = row.points - row.xpts;
                      return (
                        <tr
                          key={`${row.groupName ?? 'g'}-${row.teamId}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <ClubCrest
                                club={{
                                  id: row.teamId,
                                  name: row.teamName,
                                  code: row.teamCode,
                                  primaryColor: row.primaryColor,
                                  secondaryColor: row.secondaryColor,
                                  pattern: 'solid',
                                  logoUrl: row.logoUrl,
                                }}
                                size="sm"
                              />
                              <span>{row.teamName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {row.played}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {row.won}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {row.drawn}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {row.lost}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                            {row.goalsFor}:{row.goalsAgainst}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                            {row.xg.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                            {row.xga.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-800">
                            {row.xpts.toFixed(1)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-medium ${
                              delta >= 1.5
                                ? 'text-amber-700'
                                : delta <= -1.5
                                ? 'text-emerald-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
