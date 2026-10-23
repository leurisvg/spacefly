import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/settings/exchange_rates_vm.dart';
import 'package:spacefly_mobile/features/settings/preferences_vm.dart';
import 'package:spacefly_mobile/features/settings/settings_vm.dart';
import 'package:spacefly_mobile/features/transactions/transaction_actions.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/filters_store.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  group('server settings', () {
    test('toggles ids in a set', () {
      expect(toggleId(['1'], '2', true), ['1', '2']);
      expect(toggleId(['1', '2'], '1', false), ['2']);
      expect(toggleId(['1'], '1', true), ['1']);
    });

    test('accepts 2–60 months of history', () {
      expect([1, 2, 60, 61].map(isValidBalanceMonths), [false, true, true, false]);
    });

    Future<(ProviderContainer, TestEnv, FakeAdapter, List<RequestOptions>)> setup({int putStatus = 200}) async {
      final puts = <RequestOptions>[];
      final adapter = FakeAdapter((o) {
        if (o.method == 'PUT') {
          puts.add(o);
          return jsonBody({}, putStatus);
        }
        return o.path == '/api/settings' ? jsonBody(settingsJson()) : jsonBody({}, 404);
      });
      final env = TestEnv(config: signedInConfig, adapter: adapter);
      final c = env.container();
      c.listen(settingsProvider, (_, __) {});
      await c.read(settingsResponseProvider.future);
      return (c, env, adapter, puts);
    }

    test('starts from a copy of the server\'s settings', () async {
      final (c, _, _, _) = await setup();
      final d = c.read(settingsProvider).draft!;
      expect(d.excludedAccounts, ['1']);
      expect((d.balanceMonths, d.sankeyThreshold), (12.0, 0.02));
    });

    test('saves the draft and refreshes the reports', () async {
      final (c, env, _, puts) = await setup();
      final n = c.read(settingsProvider.notifier);
      n.toggleExcluded('2', true);
      n.patch(balanceMonths: 6);
      final d = c.read(settingsProvider).draft!;
      expect(d.excludedAccounts, ['1', '2']);
      expect(d.balanceMonths, 6.0);

      final before = c.read(filtersProvider).refreshTick;
      await n.save();
      expect(puts.single.path, '/api/settings');
      expect((puts.single.data as Map)['balanceMonths'], 6);
      expect((puts.single.data as Map)['excludedAccounts'], ['1', '2']);
      expect(env.toast.messages.single.kind, 'success');
      expect(c.read(settingsProvider).saving, isFalse);
      expect(c.read(filtersProvider).refreshTick, before + 1);
    });

    test('says so when saving fails, and keeps the draft', () async {
      final (c, env, _, _) = await setup(putStatus: 500);
      final n = c.read(settingsProvider.notifier);
      n.patch(sankeyThreshold: 0.05);
      await n.save();
      expect(env.toast.messages.single.kind, 'error');
      expect(c.read(settingsProvider).draft!.sankeyThreshold, 0.05);
      expect(c.read(settingsProvider).saving, isFalse);
    });
  });

  group('rate text', () {
    test('accepts a decimal point or comma and rejects anything that is not a positive number', () {
      expect(normalizeRate('62.5'), '62.5');
      expect(normalizeRate(' 62,5 '), '62.5');
      expect(normalizeRate('60'), '60');
      for (final bad in ['', '0', '0.00', '-1', 'abc', '1,234.5', '6 2']) {
        expect(normalizeRate(bad), isNull, reason: bad);
      }
    });

    test('shows a stored rate with up to six decimals and no padding', () {
      expect(rateText(61), '61');
      expect(rateText(62.5), '62.5');
      expect(rateText(65.123456789), '65.123457');
      expect(rateText(49.9999999999), '50');
    });
  });

  group('exchange rates', () {
    late TestEnv env;
    late FakeAdapter adapter;
    late ProviderContainer c;

    Future<void> setup({Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) async {
      var stored = exchangeRatesJson();
      adapter = FakeAdapter((o) {
        final key = '${o.method} ${o.path}';
        final custom = handlers[key];
        if (custom != null) return custom(o);
        return switch (key) {
          'GET /api/exchange-rates' => jsonBody(stored),
          'POST /api/exchange-rates' => () {
              stored = {...stored, 'rates': [{'currency': 'EUR', 'date': '2026-10-01', 'rate': 66.5, 'from': 'EUR', 'to': 'DOP'}, ...(stored['rates'] as List)]};
              return jsonBody({}, 201);
            }(),
          'DELETE /api/exchange-rates/USD/DOP/2026-09-01' => ResponseBody.fromString('', 204),
          _ => jsonBody({}, 404),
        };
      });
      env = TestEnv(config: signedInConfig, adapter: adapter);
      c = env.container();
      c.listen(exchangeRatesViewProvider, (_, __) {});
      c.listen(exchangeRateFormProvider, (_, __) {});
      await c.read(exchangeRatesProvider.future);
    }

    ExchangeRatesView view() => c.read(exchangeRatesViewProvider);
    ExchangeRateFormNotifier form() => c.read(exchangeRateFormProvider.notifier);

    test('starts on the first currency and only enables saving a valid rate', () async {
      await setup();
      expect((view().currency, view().primary), ('USD', 'DOP'));
      expect(view().canSave, isFalse);
      form().setRate('abc');
      expect(view().canSave, isFalse);
      form().setRate('62,5');
      expect(view().canSave, isTrue);
      form().setDate('2026-02-31');
      expect(view().canSave, isFalse);
    });

    test('starts on today', () async {
      await setup();
      expect(c.read(exchangeRateFormProvider).date, '2026-09-15');
    });

    test('loads a stored rate into the form and says saving will replace it', () async {
      await setup();
      form().setDate('2026-09-01');
      expect(view().replaces, isTrue);
      form().setDate('2026-09-02');
      expect(view().replaces, isFalse);
      form().edit(view().rows[1]);
      final f = c.read(exchangeRateFormProvider);
      expect((view().currency, f.date, f.rate, view().replaces), ('EUR', '2026-08-01', '65.123457', true));
    });

    test('posts the normalized rate, clears the field and reloads the list', () async {
      await setup();
      form().pick('EUR');
      form().setDate('2026-10-01');
      form().setRate('66,5');
      await form().save();

      final post = adapter.requests.singleWhere((r) => r.method == 'POST');
      expect(post.data, {'currency': 'EUR', 'date': '2026-10-01', 'rate': '66.5'});
      expect(env.toast.messages.single.kind, 'success');
      expect(c.read(exchangeRateFormProvider).rate, '');
      expect(c.read(exchangeRateFormProvider).saving, isFalse);
      await c.read(exchangeRatesProvider.future);
      expect(view().rows, hasLength(3));
    });

    test('shows the server\'s message and keeps what was typed when the save is refused', () async {
      await setup(handlers: {
        'POST /api/exchange-rates': (_) => jsonBody({'error': 'validation', 'message': 'x', 'fields': {'currency': ['That currency is not enabled in Firefly.']}}, 422),
      });
      form().setRate('60');
      await form().save();
      expect(c.read(exchangeRateFormProvider).error, 'That currency is not enabled in Firefly.');
      expect(c.read(exchangeRateFormProvider).rate, '60');
      expect(c.read(exchangeRateFormProvider).saving, isFalse);
    });

    test('does not post an invalid rate', () async {
      await setup();
      form().setRate('abc');
      await form().save();
      expect(adapter.requests.where((r) => r.method == 'POST'), isEmpty);
    });

    test('deletes after confirming, through the stored direction of the pair', () async {
      await setup();
      await form().remove(view().rows[0]);
      expect(env.confirm.asked.single.destructive, isTrue);
      expect(env.confirm.asked.single.message, contains('USD'));
      expect(adapter.requests.singleWhere((r) => r.method == 'DELETE').path, '/api/exchange-rates/USD/DOP/2026-09-01');
      expect(env.toast.messages.single.kind, 'success');
    });

    test('deletes nothing when the confirmation is declined', () async {
      await setup();
      env.confirm.answer = false;
      await form().remove(view().rows[0]);
      expect(adapter.requests.where((r) => r.method == 'DELETE'), isEmpty);
    });

    test('reports a failed delete', () async {
      await setup(handlers: {'DELETE /api/exchange-rates/USD/DOP/2026-09-01': (_) => jsonBody({}, 500)});
      await form().remove(view().rows[0]);
      expect(env.toast.messages.single.kind, 'error');
    });
  });

  group('refreshing the data', () {
    test('drops the server cache, refetches the reports and tells the user', () async {
      final adapter = FakeAdapter((o) => o.path == '/api/refresh' ? ResponseBody.fromString('', 204) : jsonBody({}, 404));
      final env = TestEnv(config: signedInConfig, adapter: adapter);
      final c = env.container();
      c.listen(refreshingProvider, (_, __) {});
      final before = c.read(filtersProvider).refreshTick;
      final done = c.read(refreshingProvider.notifier).refresh();
      expect(c.read(refreshingProvider), isTrue);
      await done;
      expect(c.read(refreshingProvider), isFalse);
      expect(c.read(filtersProvider).refreshTick, before + 1);
      expect(env.toast.messages.single.message, 'Data refreshed from Firefly');
    });

    test('says so when it fails', () async {
      final env = TestEnv(config: signedInConfig, adapter: FakeAdapter((_) => jsonBody({}, 500)));
      final c = env.container();
      c.listen(refreshingProvider, (_, __) {});
      await c.read(refreshingProvider.notifier).refresh();
      expect(env.toast.messages.single.kind, 'error');
      expect(c.read(refreshingProvider), isFalse);
    });
  });

  group('deleting a transaction', () {
    Future<(TestEnv, FakeAdapter)> setup({int status = 204}) async {
      final adapter = FakeAdapter((o) => o.method == 'DELETE' ? (status == 204 ? ResponseBody.fromString('', 204) : jsonBody({}, status)) : jsonBody({}, 404));
      return (TestEnv(config: signedInConfig, adapter: adapter), adapter);
    }

    test('asks, deletes, tells the user and goes back to the list', () async {
      final (env, adapter) = await setup();
      final ok = await env.container().read(transactionActionsProvider).remove(groupId: '9', name: 'Cena');
      expect(ok, isTrue);
      expect(env.confirm.asked.single.message, contains('Cena'));
      expect(adapter.requests.single.path, '/api/transactions/9');
      expect(env.toast.messages.single.message, 'Transaction deleted');
      expect(env.back.fallbacks, ['/transactions']);
    });

    test('words the question differently for a transaction with several parts', () async {
      final (env, _) = await setup();
      await env.container().read(transactionActionsProvider).remove(groupId: '9', name: 'Cena', splitCount: 2);
      expect(env.confirm.asked.single.message, contains('several parts'));
    });

    test('deletes nothing when declined, and reports a failure', () async {
      final (declined, adapter) = await setup();
      declined.confirm.answer = false;
      expect(await declined.container().read(transactionActionsProvider).remove(groupId: '9', name: 'x'), isFalse);
      expect(adapter.requests, isEmpty);

      final (failing, _) = await setup(status: 500);
      expect(await failing.container().read(transactionActionsProvider).remove(groupId: '9', name: 'x'), isFalse);
      expect(failing.toast.messages.single.kind, 'error');
      expect(failing.back.fallbacks, isEmpty);
    });
  });
}
