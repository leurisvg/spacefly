import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../i18n/strings.g.dart';

class MoreEntry {
  const MoreEntry(this.route, this.icon, this.label);
  final String route;
  final IconData icon;
  final String Function(Translations t) label;
}

class MoreSection {
  const MoreSection(this.title, this.entries);
  final String Function(Translations t) title;
  final List<MoreEntry> entries;
}

/// Everything the other tabs do not hold, grouped like the web's sidebar. An entry appears when its screen exists.
final moreSections = <MoreSection>[
  MoreSection((t) => t.nav.sections.reports, [
    MoreEntry('/reports/monthly', Icons.summarize_outlined, (t) => t.nav.monthly),
    MoreEntry('/reports/annual', Icons.bar_chart_outlined, (t) => t.nav.annual),
    MoreEntry('/reports/flow', Icons.account_tree_outlined, (t) => t.nav.flow),
    MoreEntry('/reports/calendar', Icons.calendar_month_outlined, (t) => t.nav.calendar),
    MoreEntry('/reports/compare', Icons.compare_arrows, (t) => t.nav.compare),
  ]),
  MoreSection((t) => t.nav.sections.analysis, [
    MoreEntry('/analysis/categories', Icons.category_outlined, (t) => t.nav.categories),
    MoreEntry('/analysis/tags', Icons.sell_outlined, (t) => t.nav.tags),
    MoreEntry('/analysis/budgets', Icons.track_changes, (t) => t.nav.budgets),
    MoreEntry('/analysis/merchants', Icons.storefront_outlined, (t) => t.nav.merchants),
    MoreEntry('/analysis/income-sources', Icons.work_outline, (t) => t.nav.incomeSources),
  ]),
  MoreSection((t) => t.nav.sections.accounts, [
    MoreEntry('/accounts/expense', Icons.shopping_cart_outlined, (t) => t.nav.expenseAccounts),
    MoreEntry('/accounts/revenue', Icons.volunteer_activism_outlined, (t) => t.nav.revenueAccounts),
    MoreEntry('/accounts/net-worth', Icons.account_balance_outlined, (t) => t.nav.netWorth),
    MoreEntry('/accounts/savings', Icons.savings_outlined, (t) => t.nav.savings),
  ]),
  MoreSection((t) => t.nav.sections.planning, [
    MoreEntry('/planning/bills', Icons.autorenew, (t) => t.nav.bills),
    MoreEntry('/planning/recurring', Icons.event_repeat_outlined, (t) => t.nav.recurring),
    MoreEntry('/planning/goals', Icons.flag_outlined, (t) => t.nav.goals),
    MoreEntry('/planning/projection', Icons.timeline, (t) => t.nav.projection),
  ]),
  MoreSection((t) => t.nav.sections.create, [
    MoreEntry('/transactions/new', Icons.add_card_outlined, (t) => t.nav.newTransaction),
    MoreEntry('/edit/category', Icons.category_outlined, (t) => t.editor.entity.category.kNew),
    MoreEntry('/edit/tag', Icons.sell_outlined, (t) => t.editor.entity.tag.kNew),
    MoreEntry('/edit/budget', Icons.track_changes, (t) => t.editor.entity.budget.kNew),
    MoreEntry('/edit/bill', Icons.autorenew, (t) => t.editor.entity.bill.kNew),
    MoreEntry('/edit/account', Icons.account_balance_wallet_outlined, (t) => t.editor.entity.account.kNew),
    MoreEntry('/edit/piggy', Icons.savings_outlined, (t) => t.editor.entity.piggy.kNew),
  ]),
  MoreSection((t) => t.nav.sections.system, [
    MoreEntry('/about', Icons.info_outline, (t) => t.nav.about),
  ]),
];

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(t.nav.more)),
      body: ListView(
        key: const Key('more'),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
        children: [
          for (final section in moreSections) ...[
            Padding(padding: const EdgeInsets.fromLTRB(4, 12, 4, 8), child: Text(section.title(t), style: Theme.of(context).textTheme.titleSmall?.copyWith(color: scheme.onSurfaceVariant))),
            Card(
              child: Column(
                children: [
                  for (final e in section.entries)
                    ListTile(
                      key: Key('more-${e.route}'),
                      leading: Icon(e.icon),
                      title: Text(e.label(t)),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push(e.route),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
