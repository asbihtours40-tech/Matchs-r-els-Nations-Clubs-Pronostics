export type LeagueId =
  | 'uefa-nations'
  | 'fifa-friendly'
  | 'ligue-1'
  | 'premier-league'
  | 'la-liga'
  | 'serie-a'
  | 'bundesliga'
  | 'champions-league';

export type TeamCategory = 'nation' | 'club';

export type CrestPattern = 'solid' | 'stripes' | 'halves' | 'sash';

export interface ClubIdentity {
  id: string;
  name: string;
  shortName: string;
  code: string;
  category: TeamCategory;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: CrestPattern;
  elo: number;
}

export interface RecentMatchResult {
  opponent: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  xgFor: number;
  xgAgainst: number;
  outcome: 'V' | 'N' | 'D';
  date: string;
}

export interface TeamDetailedStats {
  leaguePosition: number;
  points: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  xgPerMatch: number;
  xgaPerMatch: number;
  possessionAvg: number;
  shotsPerMatch: number;
  shotsOnTargetPerMatch: number;
  bigChancesCreatedPerMatch: number;
  bigChancesConcededPerMatch: number;
  ppda: number;
  setPieceXgPerMatch: number;
  cleanSheetPct: number;
  cornersPerMatch: number;
  yellowCardsPerMatch: number;
  homeOrAwaySplitRecord: string;
  homeOrAwaySplitXg: number;
  homeOrAwaySplitXga: number;
  tacticalIndices: {
    attaque: number;
    defense: number;
    controle: number;
    pressing: number;
    transition: number;
    coupsPiedsArretes: number;
  };
  recentForm: RecentMatchResult[];
}

export interface PlayerAbsence {
  name: string;
  position: 'ATT' | 'MIL' | 'DEF' | 'GAR';
  reason: 'Blessure' | 'Suspension' | 'Incertain';
  impact: 'Élevé' | 'Modéré' | 'Faible';
  xgImpactNote: string;
}

export interface KeyScorer {
  name: string;
  position: string;
  goals: number;
  assists: number;
  xgPer90: number;
  anytimeGoalProb: number;
}

export interface HeadToHeadMatch {
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
}

export interface MarketOdds {
  home: number;
  draw: number;
  away: number;
  over25: number;
  under25: number;
  bttsYes: number;
  bttsNo: number;
}

export interface MatchPredictionSummary {
  primaryPickLabel: string;
  primaryMarket: '1N2' | 'Double Chance' | 'Plus/Moins 2.5' | 'BTTS';
  confidencePct: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  rationale: string[];
}

export interface LiveBoxscoreStats {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  passesHome: number;
  passesAway: number;
  passAccuracyHome: number;
  passAccuracyAway: number;
}

export interface FootballMatch {
  id: string;
  espnSlug: string;
  leagueId: LeagueId;
  leagueName: string;
  category: TeamCategory;
  matchday: string;
  kickoffIso: string;
  displayDate: string;
  displayTime: string;
  stadium: string;
  city: string;
  referee: string;
  refereeCardsAvg: number;
  weather: string;
  status: 'upcoming' | 'live' | 'finished';
  liveClock?: string;
  finalScore?: {
    home: number;
    away: number;
    actualHomeXg: number;
    actualAwayXg: number;
    possessionHome: number;
    shotsHome: number;
    shotsAway: number;
  };
  boxscoreStats?: LiveBoxscoreStats;
  homeTeam: ClubIdentity;
  awayTeam: ClubIdentity;
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeAbsences: PlayerAbsence[];
  awayAbsences: PlayerAbsence[];
  homeKeyPlayers: KeyScorer[];
  awayKeyPlayers: KeyScorer[];
  h2hSummary: {
    homeWins: number;
    draws: number;
    awayWins: number;
    avgGoals: number;
    recentMeetings: HeadToHeadMatch[];
  };
  odds: MarketOdds;
  predictionSummary: MatchPredictionSummary;
  detailLoaded?: boolean;
}

export interface ExactScoreProb {
  home: number;
  away: number;
  probability: number;
  fairOdd: number;
}

export interface ValueOpportunity {
  market: string;
  selection: string;
  modelProb: number;
  impliedProb: number;
  marketOdd: number;
  edgePct: number;
}

export interface PoissonOutput {
  homeLambda: number;
  awayLambda: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over15Prob: number;
  over25Prob: number;
  under25Prob: number;
  over35Prob: number;
  bttsYesProb: number;
  bttsNoProb: number;
  doubleChance1N: number;
  doubleChanceN2: number;
  doubleChance12: number;
  matrix: number[][];
  topScores: ExactScoreProb[];
  valueOpportunities: ValueOpportunity[];
}

export interface SavedPredictionPick {
  id: string;
  matchId: string;
  matchLabel: string;
  leagueName: string;
  kickoffLabel: string;
  market: string;
  selection: string;
  odd: number;
  modelProbPct: number;
  stake: number;
  createdAt: string;
  status: 'pending' | 'won' | 'lost';
}

export interface LeagueStandingRow {
  rank: number;
  groupName?: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  xg: number;
  xga: number;
  xpts: number;
  form: ('V' | 'N' | 'D')[];
}
