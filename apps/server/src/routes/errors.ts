import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import type { ValidationErrorBody } from '@spacefly/shared';
import type { AppEnv } from '../app.types';
import { FireflyError } from '../firefly/firefly.client';

export class BadRequest extends Error {}

/** A request that parsed fine but breaks a rule SpaceFly checks itself (e.g. an invalid account pair). */
export class ValidationFailed extends Error {
  constructor(
    readonly fields: Record<string, string[]>,
    message = 'Validation failed',
  ) {
    super(message);
  }
}

/** The target exists but SpaceFly can't edit it safely (several splits, a reconciliation…). */
export class NotEditable extends Error {
  constructor(
    message: string,
    readonly reason: 'splits' | 'type' = 'splits',
  ) {
    super(message);
  }
}

/** Firefly field names that don't map to a DTO field by simply camel-casing them. */
const FIELD_ALIASES: Record<string, string> = {
  source_id: 'source',
  source_name: 'source',
  destination_id: 'destination',
  destination_name: 'destination',
  category_id: 'category',
  category_name: 'category',
  budget_name: 'budgetId',
  bill_id: 'billId',
  bill_name: 'billId',
  subscription_id: 'billId',
  subscription_name: 'billId',
  foreign_currency_id: 'foreignCurrency',
  foreign_currency_code: 'foreignCurrency',
  currency_id: 'currency',
  currency_code: 'currency',
  auto_budget_type: 'autoBudget',
  auto_budget_amount: 'autoBudget',
  auto_budget_period: 'autoBudget',
  auto_budget_currency_id: 'autoBudget',
  auto_budget_currency_code: 'autoBudget',
  object_group_title: 'group',
  object_group_id: 'group',
  account_role: 'role',
  opening_balance_date: 'openingBalanceDate',
  liability_amount: 'openingBalance',
  liability_start_date: 'openingBalanceDate',
  monthly_payment_date: 'monthlyPaymentDate',
  credit_card_type: 'creditCardType',
  include_net_worth: 'includeNetWorth',
  group_title: 'description',
};

const camel = (s: string): string => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** `transactions.0.source_id` → `source`; `amount_min` → `amountMin`. */
export function translateField(key: string): string {
  const last = key.replace(/^transactions\.\d+\./, '').replace(/\.\d+(\.|$)/g, '$1');
  const root = last.split('.')[0]!;
  if (root === 'accounts') return 'accounts';
  return FIELD_ALIASES[root] ?? camel(root);
}

export function translateFields(errors: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(errors)) {
    const field = translateField(key);
    (out[field] ??= []).push(...messages);
  }
  return out;
}

const validation = (c: Context<AppEnv>, message: string, fields: Record<string, string[]>) =>
  c.json<ValidationErrorBody>({ error: 'validation', message, fields }, 422);

export function handleApiError(err: Error, c: Context<AppEnv>) {
  if (err instanceof z.ZodError) return c.json({ error: 'bad_request', issues: err.issues }, 400);
  if (err instanceof BadRequest) return c.json({ error: 'bad_request', message: err.message }, 400);
  if (err instanceof ValidationFailed) return validation(c, err.message, err.fields);
  if (err instanceof NotEditable) return c.json({ error: 'not_editable', reason: err.reason, message: err.message }, 409);
  if (err instanceof FireflyError) {
    if (err.status === 401) return c.json({ error: 'unauthenticated' }, 401);
    if (err.status === 422) {
      return validation(c, err.fireflyMessage ?? 'Validation failed', translateFields(err.errors));
    }
    if (err.status === 404) return c.json({ error: 'not_found' }, 404);
    console.error('[firefly]', err.message);
    return c.json({ error: 'firefly_error', status: err.status }, 502);
  }
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    console.error('[api] upstream timeout:', err.message);
    return c.json({ error: 'timeout' }, 504 satisfies ContentfulStatusCode);
  }
  console.error('[api]', err);
  return c.json({ error: 'internal_error' }, 500);
}
