import 'package:flutter/material.dart';

import '../i18n/strings.g.dart';

enum AppTab {
  dashboard(Icons.space_dashboard_outlined, Icons.space_dashboard),
  transactions(Icons.receipt_long_outlined, Icons.receipt_long),
  accounts(Icons.account_balance_wallet_outlined, Icons.account_balance_wallet),
  settings(Icons.settings_outlined, Icons.settings);

  const AppTab(this.icon, this.selectedIcon);
  final IconData icon;
  final IconData selectedIcon;

  String label(Translations t) => switch (this) {
        dashboard => t.nav.dashboard,
        transactions => t.nav.sections.transactions,
        accounts => t.nav.sections.accounts,
        settings => t.nav.settings,
      };
}

/// A tab whose screen has not been ported yet: the section title over an empty state.
class PlaceholderTab extends StatelessWidget {
  const PlaceholderTab(this.tab, {super.key});
  final AppTab tab;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(tab.label(context.t))),
      body: Center(child: Icon(tab.icon, size: 72, color: scheme.outline)),
    );
  }
}
