import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' show BuildContext, GlobalKey, NavigatorState, Widget, ValueKey;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'api/models.g.dart' show CounterpartyKind, TxRow;
import 'features/analysis/ranking_vm.dart' show RankingRoute;
import 'features/editor/entity_form_vm.dart' show EntityKind;
import 'features/route_params.dart';
import 'screens/about_screen.dart';
import 'screens/account_detail_screen.dart';
import 'screens/accounts_screen.dart';
import 'screens/annual_screen.dart';
import 'screens/bills_screen.dart';
import 'screens/budgets_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/compare_screen.dart';
import 'screens/counterparties_screen.dart';
import 'screens/counterparty_detail_screen.dart';
import 'screens/monthly_screen.dart';
import 'screens/more_tab.dart';
import 'screens/net_worth_screen.dart';
import 'screens/savings_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/entity_form_screen.dart';
import 'screens/flow_screen.dart';
import 'screens/goals_screen.dart';
import 'screens/projection_screen.dart';
import 'screens/recurring_screen.dart';
import 'screens/ranking_screen.dart';
import 'screens/login_screen.dart';
import 'screens/server_screen.dart';
import 'screens/settings_tab.dart';
import 'screens/shell.dart';
import 'screens/transactions_screen.dart';
import 'screens/exchange_rates_screen.dart';
import 'screens/server_settings_screen.dart';
import 'screens/transaction_form_screen.dart';
import 'screens/tx_detail_screen.dart';
import 'storage/server_config.dart';

/// Where [returnTo] (a location the login screen was reached from) leads after signing in: the path it names, or home when it is
/// missing, not a path of this app or one of the screens that sign in / configure the server.
String safeReturnTo(String? returnTo) {
  if (returnTo == null || !returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';
  final path = Uri.tryParse(returnTo)?.path;
  return path == null || path == '/login' || path == '/server' ? '/' : returnTo;
}

/// Where a location (path and query) must be sent given the server configuration, or `null` to stay. Pure so it can be tested.
///  - no server URL yet → the server screen;
///  - a server but no token → the login screen (the server screen stays reachable to change it), which remembers where the user was
///    in `?returnTo=`;
///  - signed in → the login screen leads to that place, or home.
String? guard(ServerConfig config, String location) {
  final uri = Uri.parse(location);
  final path = uri.path;
  if (!config.configured) return path == '/server' ? null : '/server';
  if (!config.signedIn) {
    if (path == '/login' || path == '/server') return null;
    return location == '/' ? '/login' : '/login?returnTo=${Uri.encodeQueryComponent(location)}';
  }
  return path == '/login' ? safeReturnTo(uri.queryParameters['returnTo']) : null;
}

/// The kind named by an `/edit/:kind` location, or `null` for one that does not exist.
EntityKind? entityKindOf(String? name) => EntityKind.values.where((k) => k.name == name).firstOrNull;

String? _entityRedirect(BuildContext context, GoRouterState state) => entityKindOf(state.pathParameters['kind']) == null ? '/more' : null;

Widget _entityScreen(GoRouterState state) => EntityFormScreen(
      key: ValueKey(state.uri.toString()),
      kind: entityKindOf(state.pathParameters['kind'])!,
      id: state.pathParameters['id'],
      accountType: state.uri.queryParameters['type'],
    );

/// The navigator above the tab shell: full-screen routes (a transaction, a report) push onto it.
final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  // The router must re-run its redirect when the config changes (login, logout, 401), without being rebuilt.
  final refresh = ValueNotifier<int>(0);
  ref.listen(serverConfigProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  String? appliedLocation;

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final to = guard(ref.read(serverConfigProvider), state.uri.toString());
      if (to != null) return to;
      // A link's query (`/reports/flow?mode=tags`) goes into the screen's state, once per location: a router refresh must not undo
      // what the user changed since.
      final location = state.uri.toString();
      if (location != appliedLocation) applyRouteParams(ref.read, state.uri);
      appliedLocation = location;
      return null;
    },
    routes: [
      GoRoute(path: '/server', builder: (_, __) => const ServerScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      // Reports open over the tab bar.
      GoRoute(path: '/reports/monthly', builder: (_, __) => const MonthlyScreen()),
      GoRoute(path: '/reports/annual', builder: (_, __) => const AnnualScreen()),
      GoRoute(path: '/reports/calendar', builder: (_, __) => const CalendarScreen()),
      GoRoute(path: '/reports/compare', builder: (_, __) => const CompareScreen()),
      // Create / edit a category, tag, budget, subscription, account or goal (`/edit/account?type=expense`, `/edit/budget/12`).
      GoRoute(path: '/edit/:kind', redirect: _entityRedirect, builder: (_, state) => _entityScreen(state)),
      GoRoute(path: '/edit/:kind/:id', redirect: _entityRedirect, builder: (_, state) => _entityScreen(state)),
      // The account screens that are not a tab. The fixed paths come before `:id`, or "savings" would be taken for an account.
      GoRoute(path: '/accounts/net-worth', builder: (_, __) => const NetWorthScreen()),
      GoRoute(path: '/accounts/savings', builder: (_, __) => const SavingsScreen()),
      GoRoute(path: '/accounts/expense', builder: (_, __) => const CounterpartiesScreen(kind: CounterpartyKind.EXPENSE)),
      GoRoute(path: '/accounts/revenue', builder: (_, __) => const CounterpartiesScreen(kind: CounterpartyKind.INCOME)),
      GoRoute(path: '/accounts/expense/:id', builder: (_, state) => CounterpartyDetailScreen(key: ValueKey(state.uri.toString()), kind: CounterpartyKind.EXPENSE, id: state.pathParameters['id']!)),
      GoRoute(path: '/accounts/revenue/:id', builder: (_, state) => CounterpartyDetailScreen(key: ValueKey(state.uri.toString()), kind: CounterpartyKind.INCOME, id: state.pathParameters['id']!)),
      GoRoute(path: '/accounts/:id', builder: (_, state) => AccountDetailScreen(key: ValueKey(state.uri.toString()), id: state.pathParameters['id']!)),
      GoRoute(path: '/planning/bills', builder: (_, __) => const BillsScreen()),
      GoRoute(path: '/planning/recurring', builder: (_, __) => const RecurringScreen()),
      GoRoute(path: '/planning/goals', builder: (_, __) => const GoalsScreen()),
      GoRoute(path: '/planning/projection', builder: (_, __) => const ProjectionScreen()),
      GoRoute(path: '/about', builder: (_, __) => const AboutScreen()),
      GoRoute(path: '/reports/flow', builder: (_, __) => const FlowScreen()),
      GoRoute(path: '/analysis/categories', builder: (_, __) => const RankingScreen(route: RankingRoute.categories)),
      GoRoute(path: '/analysis/tags', builder: (_, __) => const RankingScreen(route: RankingRoute.tags)),
      GoRoute(path: '/analysis/merchants', builder: (_, __) => const RankingScreen(route: RankingRoute.merchants)),
      GoRoute(path: '/analysis/income-sources', builder: (_, __) => const RankingScreen(route: RankingRoute.incomeSources)),
      GoRoute(path: '/analysis/budgets', builder: (_, __) => const BudgetsScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => Shell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, __) => const DashboardScreen())]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/transactions',
              builder: (_, __) => const TransactionsScreen(),
              routes: [
                // `new` before `:id`, or "new" would be taken for an id
                GoRoute(path: 'new', parentNavigatorKey: rootNavigatorKey, builder: (_, state) => newTransactionScreen(state)),
                GoRoute(
                  path: ':id',
                  parentNavigatorKey: rootNavigatorKey,
                  builder: (_, state) => TxDetailScreen(id: state.pathParameters['id']!, row: state.extra is TxRow ? state.extra as TxRow : null),
                  routes: [
                    GoRoute(path: 'edit', parentNavigatorKey: rootNavigatorKey, builder: (_, state) => TransactionFormScreen(id: state.pathParameters['id']!)),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/accounts', builder: (_, __) => const AccountsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (_, __) => const MoreTab())]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/settings',
              builder: (_, __) => const SettingsTab(),
              routes: [
                GoRoute(path: 'server', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const ServerSettingsScreen()),
                GoRoute(path: 'exchange-rates', parentNavigatorKey: rootNavigatorKey, builder: (_, __) => const ExchangeRatesScreen()),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
