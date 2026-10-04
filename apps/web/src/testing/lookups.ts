import type { EditorLookups } from '@shared';

/** What `/api/lookups/editor` would answer for the specs. */
export const EDITOR_LOOKUPS: EditorLookups = {
  accounts: [
    { id: '1', name: 'Banco Popular', kind: 'asset', liabilityType: null, currency: 'DOP', balance: 1500, role: 'defaultAsset', group: null },
    { id: '2', name: 'Cuenta USD', kind: 'asset', liabilityType: null, currency: 'USD', balance: 200, role: 'savingAsset', group: null },
    { id: '5', name: 'Préstamo', kind: 'liability', liabilityType: 'loan', currency: 'DOP', balance: -50000, role: null, group: null },
    { id: '10', name: 'Empresa SRL', kind: 'revenue', liabilityType: null, currency: 'DOP', balance: 0, role: null, group: null },
    { id: '20', name: 'Supermercado', kind: 'expense', liabilityType: null, currency: 'DOP', balance: 0, role: null, group: null },
  ],
  categories: [{ id: '1', name: 'Comida' }],
  tags: [{ id: '1', name: 'hogar' }],
  budgets: [{ id: '1', name: 'Hogar' }],
  bills: [{ id: '1', name: 'Luz', currency: 'DOP', active: true }],
  piggyBanks: [{ id: '1', name: 'Fondo', currency: 'DOP' }],
  currencies: [
    { code: 'DOP', name: 'Peso', symbol: 'RD$', decimals: 2 },
    { code: 'USD', name: 'Dollar', symbol: 'US$', decimals: 2 },
  ],
  defaultAccountId: '1',
};
