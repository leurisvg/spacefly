import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' show GlobalKey, NavigatorState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'api/models.g.dart' show TxRow;
import 'screens/accounts_screen.dart';
import 'screens/annual_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/compare_screen.dart';
import 'screens/monthly_screen.dart';
import 'screens/more_tab.dart';
import 'screens/dashboard_screen.dart';
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

/// Where a location must be sent given the server configuration, or `null` to stay. Pure so it can be tested.
///  - no server URL yet → the server screen;
///  - a server but no token → the login screen (the server screen stays reachable to change it);
///  - signed in → the login screen has nothing to show.
String? guard(ServerConfig config, String location) {
  if (!config.configured) return location == '/server' ? null : '/server';
  if (!config.signedIn) return location == '/login' || location == '/server' ? null : '/login';
  return location == '/login' ? '/' : null;
}

/// The navigator above the tab shell: full-screen routes (a transaction, a report) push onto it.
final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  // The router must re-run its redirect when the config changes (login, logout, 401), without being rebuilt.
  final refresh = ValueNotifier<int>(0);
  ref.listen(serverConfigProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) => guard(ref.read(serverConfigProvider), state.matchedLocation),
    routes: [
      GoRoute(path: '/server', builder: (_, __) => const ServerScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      // Reports open over the tab bar.
      GoRoute(path: '/reports/monthly', builder: (_, __) => const MonthlyScreen()),
      GoRoute(path: '/reports/annual', builder: (_, __) => const AnnualScreen()),
      GoRoute(path: '/reports/calendar', builder: (_, __) => const CalendarScreen()),
      GoRoute(path: '/reports/compare', builder: (_, __) => const CompareScreen()),
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
