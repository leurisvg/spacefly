/// Transaction type inference. The user never picks a type: Firefly derives it from the kind of the source and destination accounts.
/// Port of libs/shared/src/utils/tx-type.ts, on the generated `AccountKind` / `AccountSlot` / `TxKind` enums.
library;

import '../api/models.g.dart' show AccountKind, AccountSlot, TxKind;

const _kinds = <String, AccountKind>{
  'asset': AccountKind.ASSET,
  'asset account': AccountKind.ASSET,
  'default account': AccountKind.ASSET,
  'expense': AccountKind.EXPENSE,
  'expense account': AccountKind.EXPENSE,
  'beneficiary': AccountKind.EXPENSE,
  'revenue': AccountKind.REVENUE,
  'revenue account': AccountKind.REVENUE,
  'cash': AccountKind.CASH,
  'cash account': AccountKind.CASH,
  'liability': AccountKind.LIABILITY,
  'liabilities': AccountKind.LIABILITY,
  'loan': AccountKind.LIABILITY,
  'debt': AccountKind.LIABILITY,
  'mortgage': AccountKind.LIABILITY,
};

/// Maps any of Firefly's account type spellings to a kind; `null` for system accounts (opening balance…).
AccountKind? accountKind(String? type) => type == null ? null : _kinds[type.trim().toLowerCase()];

/// What a picked account is for the purpose of the type: its kind (an account that is not yet known counts as no slot).
AccountSlot? slotOfKind(AccountKind? kind) => switch (kind) {
      null => null,
      AccountKind.ASSET => AccountSlot.ASSET,
      AccountKind.CASH => AccountSlot.CASH,
      AccountKind.EXPENSE => AccountSlot.EXPENSE,
      AccountKind.LIABILITY => AccountSlot.LIABILITY,
      AccountKind.REVENUE => AccountSlot.REVENUE,
    };

bool _owned(AccountSlot? k) => k == AccountSlot.ASSET || k == AccountSlot.LIABILITY;

/// The transaction type for a source/destination pair, or `null` when the pair is not allowed. A new name typed in the destination
/// becomes an expense account; in the source, a revenue account.
TxKind? inferTransactionType(AccountSlot? source, AccountSlot? destination) {
  if (source == null || destination == null) return null;
  if (source == AccountSlot.NEW && destination == AccountSlot.NEW) return null;
  final from = source == AccountSlot.NEW ? AccountSlot.REVENUE : source;
  final to = destination == AccountSlot.NEW ? AccountSlot.EXPENSE : destination;

  switch (from) {
    case AccountSlot.ASSET:
      if (to == AccountSlot.ASSET) return TxKind.TRANSFER;
      if (to == AccountSlot.EXPENSE || to == AccountSlot.CASH || to == AccountSlot.LIABILITY) return TxKind.WITHDRAWAL;
      return null;
    case AccountSlot.LIABILITY:
      if (to == AccountSlot.ASSET) return TxKind.DEPOSIT;
      if (to == AccountSlot.LIABILITY) return TxKind.TRANSFER;
      if (to == AccountSlot.EXPENSE) return TxKind.WITHDRAWAL;
      return null;
    case AccountSlot.REVENUE:
    case AccountSlot.CASH:
      return _owned(to) ? TxKind.DEPOSIT : null;
    default:
      return null;
  }
}

enum AmountSide { source, destination }

/// Which account's currency the main amount is expressed in.
AmountSide amountSide(TxKind type) => type == TxKind.DEPOSIT ? AmountSide.destination : AmountSide.source;

/// The wire spelling of a type (`withdrawal`, `deposit`, `transfer`).
String txKindName(TxKind type) => type.name.toLowerCase();
