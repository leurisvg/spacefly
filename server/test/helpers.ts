import type { Period } from '@shared';
import { CurrencyService } from '../src/core/currency.service';
import { normalizeGroups, ReportContext, type Split } from '../src/core/ledger';
import type { FfResource, FfTransactionGroup } from '../src/firefly/firefly.types';
import { AUGUST, RATES, SEPTEMBER } from './fixtures/firefly-fixture';

export const SEP: Period = { start: '2026-09-01', end: '2026-09-30' };
export const AUG: Period = { start: '2026-08-01', end: '2026-08-31' };

export const fx = () => new CurrencyService('DOP', RATES, null);
export const ctxFor = (period: Period, currency = 'DOP') => new ReportContext(period, currency, fx());

const groups = (g: unknown[]) => normalizeGroups(g as FfResource<FfTransactionGroup>[]);
export const sepSplits = (): Split[] => groups(SEPTEMBER);
export const augSplits = (): Split[] => groups(AUGUST);
