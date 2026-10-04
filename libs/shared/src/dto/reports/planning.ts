export interface BillRow {
  id: string;
  name: string;
  active: boolean;
  currency: string;
  amountMin: number;
  amountMax: number;
  amountAvg: number;
  repeatFreq: string;
  skip: number;
  monthlyEquivalent: number;
  yearlyEquivalent: number;
  nextDate: string | null;
  expectedInPeriod: string[];
  paidInPeriod: { date: string; amount: number; journalId: string }[];
  status: 'paid' | 'pending' | 'not-expected';
  /** Last paid amount outside [min, max]. */
  outOfRange: boolean;
}

export interface BillsReport {
  bills: BillRow[];
  monthlyTotal: number;
  yearlyTotal: number;
  paidCount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface RecurrenceRow {
  id: string;
  title: string;
  type: string;
  active: boolean;
  amount: number;
  currency: string;
  repetition: string;
  source: string;
  destination: string;
  category: string | null;
  nextOccurrences: string[];
  repeatUntil: string | null;
}

export interface RecurrencesReport {
  recurrences: RecurrenceRow[];
}

export interface ProjectionEvent {
  date: string;
  name: string;
  kind: 'bill' | 'recurrence';
  amount: number;
}

export interface ProjectionReport {
  startBalance: number;
  days: { date: string; balance: number; inflow: number; outflow: number }[];
  events: ProjectionEvent[];
  horizons: { days: number; balance: number }[];
  lowest: { date: string; balance: number };
}

export interface PiggyBankRow {
  id: string;
  name: string;
  currency: string;
  target: number | null;
  current: number;
  leftToSave: number | null;
  pct: number | null;
  startDate: string | null;
  targetDate: string | null;
  /** Average monthly contribution over the last 6 months. */
  monthlyPace: number;
  estimatedDate: string | null;
  onTrack: boolean | null;
  accounts: string[];
  group: string | null;
}

export interface PiggyBanksReport {
  piggyBanks: PiggyBankRow[];
  totalSaved: number;
  totalTarget: number;
}
