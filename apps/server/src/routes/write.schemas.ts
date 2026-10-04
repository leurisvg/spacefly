import type { Context } from 'hono';
import { z } from 'zod';
import {
  isIsoDate,
  isPositiveAmount,
  type AccountWrite,
  type BillWrite,
  type BudgetWrite,
  type CategoryWrite,
  type PiggyWrite,
  type TagWrite,
  type TxWriteRequest,
} from '@spacefly/shared';
import type { AppEnv } from '../app.types';
import { BadRequest, ValidationFailed } from './errors';

/** Empty strings from a form mean "nothing". */
export const nullable = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema.nullable()).default(null);

export const text = (max: number) => z.string().trim().max(max);
export const dateStr = z.string().refine(isIsoDate, 'The date is not valid.');
export const code = z.string().regex(/^[A-Z]{3}$/, 'The currency code is not valid.');

const accountInput = z.union([
  z.object({ id: z.string().min(1) }).strict(),
  z.object({ name: text(255).min(1, 'The account name is required.') }).strict(),
]);

export const idParam = z.string().regex(/^[\w-]{1,40}$/, 'Invalid id');

export const txWriteSchema = z.object({
  description: text(1000).min(1, 'The description is required.'),
  date: dateStr,
  time: nullable(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'The time is not valid.')),
  source: accountInput,
  destination: accountInput,
  amount: z.string().max(40),
  foreignAmount: nullable(z.string().max(40)),
  foreignCurrency: nullable(code),
  category: nullable(text(255)),
  budgetId: nullable(z.string().max(40)),
  billId: nullable(z.string().max(40)),
  tags: z.array(text(255).min(1)).max(50).default([]),
  notes: nullable(z.string().max(65_000)),
}) satisfies z.ZodType<TxWriteRequest, unknown>;

export type TxWriteBody = z.infer<typeof txWriteSchema>;

export const categorySchema = z.object({
  name: text(255).min(1, 'The name is required.'),
  notes: nullable(text(65_000)),
}) satisfies z.ZodType<CategoryWrite, unknown>;

export const tagSchema = z.object({
  tag: text(255).min(1, 'The name is required.'),
  date: nullable(dateStr),
  description: nullable(text(65_000)),
}) satisfies z.ZodType<TagWrite, unknown>;

/** Parses the JSON body; invalid fields become a 422 keyed by field name, broken JSON a 400. */
export async function parseBody<S extends z.ZodType>(c: Context<AppEnv>, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new BadRequest('The body must be valid JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = typeof issue.path[0] === 'string' ? issue.path[0] : '_';
    (fields[key] ??= []).push(issue.code === 'invalid_union' ? 'The value is not valid.' : issue.message);
  }
  throw new ValidationFailed(fields, 'Invalid request');
}

const decimal = z.string().refine(isPositiveAmount, 'The amount must be greater than zero.');

export const budgetSchema = z.object({
  name: text(255).min(1, 'The name is required.'),
  active: z.boolean(),
  notes: nullable(text(65_000)),
  autoBudget: z
    .object({
      type: z.enum(['reset', 'rollover', 'adjusted']),
      amount: decimal,
      period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'half-year', 'yearly']),
      currency: code,
    })
    .nullable()
    .default(null),
}) satisfies z.ZodType<BudgetWrite, unknown>;

export const billSchema = z
  .object({
    name: text(255).min(1, 'The name is required.'),
    amountMin: decimal,
    amountMax: decimal,
    currency: code,
    date: dateStr,
    repeatFreq: z.enum(['weekly', 'monthly', 'quarterly', 'half-year', 'yearly']),
    skip: z.number().int().min(0).max(31),
    endDate: nullable(dateStr),
    active: z.boolean(),
    group: nullable(text(255)),
    notes: nullable(text(65_000)),
  })
  .superRefine((b, ctx) => {
    if (Number(b.amountMin) > Number(b.amountMax)) {
      ctx.addIssue({ code: 'custom', path: ['amountMax'], message: 'The maximum amount cannot be lower than the minimum.' });
    }
    if (b.endDate && b.endDate <= b.date) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'The end date must be after the first date.' });
    }
  }) satisfies z.ZodType<BillWrite, unknown>;

const signedDecimal = z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a valid amount.');
const requiredMessage = 'This field is required.';

export const accountSchema = z
  .object({
    type: z.enum(['asset', 'liability', 'expense', 'revenue']),
    name: text(255).min(1, 'The name is required.'),
    active: z.boolean(),
    iban: nullable(text(64)),
    notes: nullable(text(65_000)),
    currency: nullable(code),
    includeNetWorth: z.boolean(),
    role: nullable(z.enum(['defaultAsset', 'sharedAsset', 'savingAsset', 'ccAsset', 'cashWalletAsset'])),
    creditCardType: nullable(z.enum(['monthlyFull'])),
    monthlyPaymentDate: nullable(dateStr),
    openingBalance: nullable(signedDecimal),
    openingBalanceDate: nullable(dateStr),
    liabilityType: nullable(z.enum(['loan', 'debt', 'mortgage'])),
    liabilityDirection: nullable(z.enum(['credit', 'debit'])),
    interest: nullable(z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid percentage.')),
    interestPeriod: nullable(z.enum(['daily', 'monthly', 'yearly'])),
  })
  .superRefine((a, ctx) => {
    const need = (field: keyof typeof a) => {
      if (a[field] === null) ctx.addIssue({ code: 'custom', path: [field], message: requiredMessage });
    };
    if (a.type === 'asset') {
      need('currency');
      need('role');
      if (a.role === 'ccAsset') {
        need('creditCardType');
        need('monthlyPaymentDate');
      }
    }
    if (a.type === 'liability') {
      for (const f of ['currency', 'liabilityType', 'liabilityDirection', 'interest', 'interestPeriod'] as const) need(f);
    }
    if ((a.type === 'asset' || a.type === 'liability') && a.openingBalance !== null) need('openingBalanceDate');
  }) satisfies z.ZodType<AccountWrite, unknown>;

export const piggySchema = z
  .object({
    name: text(255).min(1, 'The name is required.'),
    currency: code,
    targetAmount: nullable(decimal),
    startDate: nullable(dateStr),
    targetDate: nullable(dateStr),
    group: nullable(text(255)),
    notes: nullable(text(65_000)),
    accounts: z
      .array(
        z.object({
          accountId: z.string().min(1).max(40),
          currentAmount: z.string().regex(/^\d+(\.\d+)?$/, 'Enter an amount of zero or more.'),
        }),
      )
      .min(1, 'Pick at least one account.')
      .max(50)
      .refine((list) => new Set(list.map((a) => a.accountId)).size === list.length, 'An account can only appear once.'),
  })
  .superRefine((p, ctx) => {
    if (p.startDate && p.targetDate && p.targetDate < p.startDate) {
      ctx.addIssue({ code: 'custom', path: ['targetDate'], message: 'The target date must be after the start date.' });
    }
  }) satisfies z.ZodType<PiggyWrite, unknown>;
