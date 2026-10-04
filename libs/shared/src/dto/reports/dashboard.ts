import type { Kpi, NamedValue } from './common';

/** A top-N slice. The folded "others" slice (`id: '__others__'`) lists the categories it groups in `children`. */
export interface TopCategory extends NamedValue {
  children?: NamedValue[];
}
import type { TxRow } from '../ledger';
import type { BudgetRow } from './monthly';
import type { CalendarDay } from './calendar';

export interface DashboardReport {
  kpis: { income: Kpi; expense: Kpi; net: Kpi; savingsRate: Kpi; netWorth: Kpi };
  months: { month: string; income: number; expense: number; net: number }[];
  netWorth: { month: string; value: number }[];
  topCategories: TopCategory[];
  budgets: BudgetRow[];
  upcomingBills: { id: string; name: string; date: string; amount: number }[];
  calendar: CalendarDay[];
  largest: TxRow[];
}
