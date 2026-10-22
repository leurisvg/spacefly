import 'package:flutter/widgets.dart' show IconData;
import 'package:flutter/material.dart' show Icons;

import '../i18n/strings.g.dart';

enum AppTab {
  dashboard(Icons.space_dashboard_outlined, Icons.space_dashboard),
  transactions(Icons.receipt_long_outlined, Icons.receipt_long),
  accounts(Icons.account_balance_wallet_outlined, Icons.account_balance_wallet),
  more(Icons.apps_outlined, Icons.apps),
  settings(Icons.settings_outlined, Icons.settings);

  const AppTab(this.icon, this.selectedIcon);
  final IconData icon;
  final IconData selectedIcon;

  String label(Translations t) => switch (this) {
        dashboard => t.nav.dashboard,
        transactions => t.nav.sections.transactions,
        accounts => t.nav.sections.accounts,
        more => t.nav.more,
        settings => t.nav.settings,
      };
}
