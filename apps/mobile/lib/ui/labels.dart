import '../i18n/strings.g.dart';

/// "Expense", "Income", "Transfer"… for a Firefly transaction type.
String txTypeLabel(Translations t, String type) => switch (type) {
      'withdrawal' => t.txType.withdrawal,
      'deposit' => t.txType.deposit,
      'transfer' => t.txType.transfer,
      'opening balance' => t.txType.openingBalance,
      'reconciliation' => t.txType.reconciliation,
      'liability credit' => t.txType.liabilityCredit,
      _ => type,
    };

/// The label of an asset account role (`savingAsset` → "Savings"), or the raw role when it is not a known one.
String accountRoleLabel(Translations t, String? role) => switch (role) {
      null => '',
      'defaultAsset' => t.accounts.roles.defaultAsset,
      'sharedAsset' => t.accounts.roles.sharedAsset,
      'savingAsset' => t.accounts.roles.savingAsset,
      'ccAsset' => t.accounts.roles.ccAsset,
      'cashWalletAsset' => t.accounts.roles.cashWalletAsset,
      _ => role,
    };
