import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FALLBACK_MATCHES, LEAGUES } from './data/matchesData';
import {
  ClubIdentity,
  FootballMatch,
  LeagueId,
  SavedPredictionPick,
  TeamCategory,
} from './types/football';
import { computePoissonModel, formatOdd, formatPct } from './utils/predictionEngine';
import { ClubCrest } from './components/ClubCrest';
import { MatchDetailPanel } from './components/MatchDetailPanel';
import { SimulatorView } from './components/SimulatorView';
import { StandingsView } from './components/StandingsView';
import { MyPredictionsView } from './components/MyPredictionsView';
import {
  Activity,
  BarChart3,
  BookmarkCheck,
  Menu,
  RefreshCw,
  Search,
  Sliders,
  Trophy,
  X,
} from 'lucide-react';

type ActiveSection = 'matches' | 'simulator' | 'standings' | 'picks';
type MatchStatusFilter = 'all' | 'live' | 'upcoming' | 'finished' | 'high-confidence';

const STORAGE_KEY = 'pronostat_saved_picks_v1';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('matches');
  const [categoryFilter, setCategoryFilter] = useState<TeamCategory | 'all'>('all');
  const [selectedLeague, setSelectedLeague] = useState<LeagueId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [teams, setTeams] = useState<ClubIdentity[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [savedPicks, setSavedPicks] = useState<SavedPredictionPick[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPicks));
    } catch {
      // Ignore storage errors
    }
  }, [savedPicks]);

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('HTTP error');
      const data = await res.json();
      const loadedMatches: FootballMatch[] =
        Array.isArray(data.matches) && data.matches.length > 0
          ? data.matches
          : FALLBACK_MATCHES;
      setMatches(loadedMatches);
      if (Array.isArray(data.teams)) {
        setTeams(data.teams);
      }
      setSelectedMatchId((prev) => {
        if (prev && loadedMatches.some((m) => m.id === prev)) return prev;
        return loadedMatches[0]?.id ?? '';
      });
    } catch {
      setMatches(FALLBACK_MATCHES);
      setSelectedMatchId((prev) => prev || FALLBACK_MATCHES[0].id);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (selectedLeague !== 'all' && m.leagueId !== selectedLeague) return false;
      if (statusFilter === 'live' && m.status !== 'live') return false;
      if (statusFilter === 'upcoming' && m.status !== 'upcoming') return false;
      if (statusFilter === 'finished' && m.status !== 'finished') return false;
      if (statusFilter === 'high-confidence' && m.predictionSummary.confidencePct < 68)
        return false;
      if (q) {
        const hay =
          `${m.homeTeam.name} ${m.awayTeam.name} ${m.leagueName} ${m.stadium} ${m.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, categoryFilter, selectedLeague, statusFilter, searchQuery]);

  const activeMatch: FootballMatch | null = useMemo(() => {
    if (filteredMatches.length === 0) return matches[0] ?? null;
    return (
      filteredMatches.find((m) => m.id === selectedMatchId) ??
      filteredMatches[0]
    );
  }, [filteredMatches, matches, selectedMatchId]);

  // Fetch rich match summary on demand when selecting a match
  useEffect(() => {
    if (!activeMatch || activeMatch.detailLoaded) return;
    const parts = activeMatch.id.split('__');
    if (parts.length !== 2) return;
    const [slug, eventId] = parts;
    if (eventId.startsWith('fallback')) return;

    let cancelled = false;
    setLoadingDetailId(activeMatch.id);
    fetch(`/api/match-detail/${encodeURIComponent(slug)}/${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.match) return;
        setMatches((prev) =>
          prev.map((m) => (m.id === data.match.id ? data.match : m))
        );
      })
      .catch(() => {
        // Keep base match card data
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMatch?.id, activeMatch?.detailLoaded]);

  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matches.length };
    for (const m of matches) {
      counts[m.leagueId] = (counts[m.leagueId] ?? 0) + 1;
    }
    return counts;
  }, [matches]);

  const kpiStats = useMemo(() => {
    const nationsCount = matches.filter((m) => m.category === 'nation').length;
    const clubsCount = matches.filter((m) => m.category === 'club').length;
    const avgConf =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + m.predictionSummary.confidencePct, 0) /
          matches.length
        : 0;
    let valueCount = 0;
    for (const m of matches) {
      if (m.status !== 'finished') {
        const p = computePoissonModel(
          m.predictionSummary.expectedHomeGoals,
          m.predictionSummary.expectedAwayGoals,
          m.odds
        );
        if (p.valueOpportunities.some((v) => v.edgePct >= 2.0)) {
          valueCount += 1;
        }
      }
    }
    return {
      totalMatches: matches.length,
      nationsCount,
      clubsCount,
      avgConfidence: Math.round(avgConf),
      valueMatches: valueCount,
    };
  }, [matches]);

  const handleAddPick = (
    pickData: Omit<SavedPredictionPick, 'id' | 'createdAt' | 'status'>
  ) => {
    setSavedPicks((prev) => {
      const exists = prev.some(
        (p) =>
          p.matchId === pickData.matchId &&
          p.market === pickData.market &&
          p.selection === pickData.selection
      );
      if (exists) {
        return prev.filter(
          (p) =>
            !(
              p.matchId === pickData.matchId &&
              p.market === pickData.market &&
              p.selection === pickData.selection
            )
        );
      }
      return [
        {
          ...pickData,
          id: `${pickData.matchId}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
        ...prev,
      ];
    });
  };

  const handleUpdateStake = (id: string, stake: number) => {
    setSavedPicks((prev) => prev.map((p) => (p.id === id ? { ...p, stake } : p)));
  };

  const handleSetStatus = (id: string, status: SavedPredictionPick['status']) => {
    setSavedPicks((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleRemovePick = (id: string) => {
    setSavedPicks((prev) => prev.filter((p) => p.id !== id));
  };

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'matches', label: 'Rencontres & Pronostics', icon: Activity },
    { id: 'simulator', label: 'Simulateur Poisson', icon: Sliders },
    { id: 'standings', label: 'Classements xPTS', icon: Trophy },
    {
      id: 'picks',
      label: 'Mes pronostics',
      icon: BookmarkCheck,
      count: savedPicks.length,
    },
  ];

  const breadcrumbText = useMemo(() => {
    if (activeSection === 'matches') {
      if (!activeMatch) return 'Rencontres / Chargement';
      return `Rencontres / ${activeMatch.homeTeam.shortName} – ${activeMatch.awayTeam.shortName}`;
    }
    if (activeSection === 'simulator') return 'Outils / Laboratoire Poisson & Elo';
    if (activeSection === 'standings') return 'Compétitions / Classements & xPTS';
    return 'Portefeuille / Mes pronostics';
  }, [activeSection, activeMatch]);

  const nationLeagues = LEAGUES.filter((l) => l.category === 'nation');
  const clubLeagues = LEAGUES.filter((l) => l.category === 'club');

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('matches');
          }}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          PronoStat
        </a>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <nav className="space-y-1" aria-label="Navigation principale">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400">
            Espace d’analyse
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-1">
          <button
            onClick={() => {
              setSelectedLeague('all');
              setCategoryFilter('all');
              setActiveSection('matches');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedLeague === 'all' && categoryFilter === 'all' && activeSection === 'matches'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>Toutes les compétitions</span>
            <span className="font-mono tabular-nums text-slate-400">
              {leagueCounts.all ?? 0}
            </span>
          </button>

          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-slate-400">
            Sélections nationales
          </div>
          {nationLeagues.map((league) => {
            const active = selectedLeague === league.id && activeSection === 'matches';
            const count = leagueCounts[league.id] ?? 0;
            return (
              <button
                key={league.id}
                onClick={() => {
                  setSelectedLeague(league.id);
                  setCategoryFilter('all');
                  setActiveSection('matches');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate pr-2">{league.label}</span>
                <span className="font-mono tabular-nums text-slate-400 shrink-0">
                  {count}
                </span>
              </button>
            );
          })}

          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-slate-400">
            Compétitions de clubs
          </div>
          {clubLeagues.map((league) => {
            const active = selectedLeague === league.id && activeSection === 'matches';
            const count = leagueCounts[league.id] ?? 0;
            return (
              <button
                key={league.id}
                onClick={() => {
                  setSelectedLeague(league.id);
                  setCategoryFilter('all');
                  setActiveSection('matches');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate pr-2">{league.label}</span>
                <span className="font-mono tabular-nums text-slate-400 shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-medium text-slate-700 mb-1">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
          <span>Données réelles · Modèle Poisson</span>
        </div>
        <p className="leading-relaxed">
          Calendrier officiel des sélections nationales et des grands championnats de clubs.
        </p>
      </div>
    </div>
  );

  return (
    <div id="top" className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (3-zone contract) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Ouvrir la navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-slate-600 truncate">
              {breadcrumbText}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveSection('picks')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Mon coupon</span>
              <span className="font-mono tabular-nums text-emerald-400">
                ({savedPicks.length})
              </span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {activeSection === 'matches' && (
            <>
              {/* Hero Header & 4-Column KPI Strip */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 text-balance">
                      Matchs réels Nations & Clubs · Pronostics
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Rencontres internationales officielles et championnats européens avec
                      calcul de probabilités Poisson, matrices de scores et statistiques détaillées.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher nation, club..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <button
                      onClick={loadMatches}
                      disabled={loadingMatches}
                      title="Actualiser le calendrier réel"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingMatches ? 'animate-spin' : ''}`}
                      />
                      <span>Actualiser</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500">Matchs réels chargés</div>
                    <div className="text-xl font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                      {kpiStats.totalMatches} rencontres
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500">Sélections vs Clubs</div>
                    <div className="text-xl font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                      {kpiStats.nationsCount} Nations · {kpiStats.clubsCount} Clubs
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500">Confiance moyenne</div>
                    <div className="text-xl font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                      {kpiStats.avgConfidence}%
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500">Écarts Value (&gt;2%)</div>
                    <div className="text-xl font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                      {kpiStats.valueMatches} affiches
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Toolbar: Category (Tout / Nations / Clubs) + Status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(
                      [
                        { id: 'all', label: 'Tout' },
                        { id: 'nation', label: 'Nations' },
                        { id: 'club', label: 'Clubs' },
                      ] as Array<{ id: TeamCategory | 'all'; label: string }>
                    ).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCategoryFilter(c.id);
                          setSelectedLeague('all');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          categoryFilter === c.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(
                      [
                        { id: 'all', label: 'Toutes' },
                        { id: 'live', label: 'En direct' },
                        { id: 'upcoming', label: 'À venir' },
                        { id: 'high-confidence', label: 'Confiance ≥ 68%' },
                        { id: 'finished', label: 'Terminées' },
                      ] as Array<{ id: MatchStatusFilter; label: string }>
                    ).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          statusFilter === f.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {filteredMatches.length} rencontre
                  {filteredMatches.length > 1 ? 's' : ''} affichée
                  {filteredMatches.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Master-Detail Workspace */}
              {loadingMatches && matches.length === 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="xl:col-span-8 h-[520px] bg-white border border-slate-200 rounded-xl animate-pulse" />
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    Aucune rencontre ne correspond à vos critères actuels.
                  </p>
                  <button
                    onClick={() => {
                      setCategoryFilter('all');
                      setSelectedLeague('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Match List Column */}
                  <div className="xl:col-span-4 space-y-2.5 xl:max-h-[960px] xl:overflow-y-auto xl:pr-1">
                    {filteredMatches.map((m) => {
                      const isSelected = activeMatch?.id === m.id;
                      const poisson = computePoissonModel(
                        m.predictionSummary.expectedHomeGoals,
                        m.predictionSummary.expectedAwayGoals,
                        m.odds
                      );

                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMatchId(m.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white border-emerald-700 ring-1 ring-emerald-700'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
                            <span className="truncate font-medium text-slate-600">
                              {m.leagueName} ·{' '}
                              {m.category === 'nation' ? 'Nation' : 'Club'}
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              {m.status === 'live'
                                ? `En direct · ${m.liveClock ?? ''}`
                                : m.status === 'finished'
                                ? 'Terminé'
                                : `${m.displayDate} ${m.displayTime}`}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ClubCrest club={m.homeTeam} size="sm" />
                                <span className="font-semibold text-sm text-slate-900 truncate">
                                  {m.homeTeam.name}
                                </span>
                              </div>
                              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 shrink-0">
                                {(m.status === 'finished' || m.status === 'live') &&
                                m.finalScore
                                  ? m.finalScore.home
                                  : formatPct(poisson.homeWinProb, 0)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ClubCrest club={m.awayTeam} size="sm" />
                                <span className="font-semibold text-sm text-slate-900 truncate">
                                  {m.awayTeam.name}
                                </span>
                              </div>
                              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 shrink-0">
                                {(m.status === 'finished' || m.status === 'live') &&
                                m.finalScore
                                  ? m.finalScore.away
                                  : formatPct(poisson.awayWinProb, 0)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-700 font-medium truncate">
                              {m.predictionSummary.primaryPickLabel}
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-emerald-700 shrink-0">
                              {m.predictionSummary.confidencePct}% · @{formatOdd(m.odds.home)}/
                              {formatOdd(m.odds.draw)}/{formatOdd(m.odds.away)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Detailed Analytics Panel */}
                  <div className="xl:col-span-8">
                    {activeMatch && (
                      <MatchDetailPanel
                        match={activeMatch}
                        isLoadingDetail={loadingDetailId === activeMatch.id}
                        savedPicks={savedPicks}
                        onAddPick={handleAddPick}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'simulator' && <SimulatorView teams={teams} />}

          {activeSection === 'standings' && <StandingsView />}

          {activeSection === 'picks' && (
            <MyPredictionsView
              picks={savedPicks}
              onUpdateStake={handleUpdateStake}
              onSetStatus={handleSetStatus}
              onRemovePick={handleRemovePick}
              onClearAll={() => setSavedPicks([])}
              onGoToMatches={() => setActiveSection('matches')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
