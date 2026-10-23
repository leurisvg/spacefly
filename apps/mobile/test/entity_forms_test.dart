import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/accounts/accounts_vm.dart';
import 'package:spacefly_mobile/features/editor/entity_form_vm.dart';
import 'package:spacefly_mobile/features/editor/entity_specs.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/shared/amount.dart';
import 'package:spacefly_mobile/state/editor_lookups.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  /// A server that answers by method and path and remembers every write.
  ({FakeAdapter adapter, List<RequestOptions> writes}) server({Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) {
    final writes = <RequestOptions>[];
    final adapter = FakeAdapter((o) {
      final key = '${o.method} ${o.path}';
      if (o.method != 'GET') writes.add(o);
      final custom = handlers[key];
      if (custom != null) return custom(o);
      return switch (key) {
        'GET /api/meta' => jsonBody(metaJson()),
        'GET /api/lookups' => jsonBody(lookupsJson()),
        'GET /api/lookups/editor' => jsonBody(editorLookupsJson()),
        'GET /api/reports/accounts' => jsonBody(report(accountsJson())),
        'POST /api/categories' => jsonBody({'id': '9'}, 201),
        'PUT /api/categories/4' => jsonBody({'id': '4'}),
        'GET /api/categories/4' => jsonBody({'id': '4', 'name': 'Comida', 'notes': null}),
        'DELETE /api/categories/4' => ResponseBody.fromString('', 204),
        'GET /api/tags/4' => jsonBody({'id': '4', 'tag': 'viaje', 'date': null, 'description': 'x'}),
        'GET /api/tags/99' => jsonBody({'error': 'not_found'}, 404),
        'POST /api/budgets' => jsonBody({'id': '1'}, 201),
        'POST /api/bills' => jsonBody({'id': '1'}, 201),
        'POST /api/piggy-banks' => jsonBody({'id': '1'}, 201),
        'GET /api/accounts/5' => jsonBody({
            'id': '5',
            'type': 'asset',
            'name': 'Banco Popular',
            'active': true,
            'iban': null,
            'notes': null,
            'currency': 'DOP',
            'includeNetWorth': true,
            'role': 'ccAsset',
            'creditCardType': 'monthlyFull',
            'monthlyPaymentDate': '2026-09-17',
            'openingBalance': '100.00',
            'openingBalanceDate': '2026-01-01',
            'liabilityType': null,
            'liabilityDirection': null,
            'interest': null,
            'interestPeriod': null,
            'transactionCount': 12,
          }),
        'DELETE /api/accounts/5' => ResponseBody.fromString('', 204),
        'PUT /api/settings/account-order' => jsonBody({}),
        'POST /api/refresh' => ResponseBody.fromString('', 204),
        _ => jsonBody({'error': 'not_found'}, 404),
      };
    });
    return (adapter: adapter, writes: writes);
  }

  Future<(TestEnv, ProviderContainer, List<RequestOptions>)> setup() async {
    final s = server();
    final env = TestEnv(config: signedInConfig, adapter: s.adapter);
    final c = env.container();
    return (env, c, s.writes);
  }

  Future<ProviderSubscription<EntityFormData>> open(ProviderContainer c, EntityFormArgs args) async {
    final sub = c.listen(entityFormProvider(args), (_, __) {});
    await pumpEventQueue();
    return sub;
  }

  const category = (kind: EntityKind.category, id: null, accountType: null);

  group('entity forms', () {
    test('creates a category, trimming the name and sending empty notes as null', () async {
      final (env, c, writes) = await setup();
      await open(c, category);
      final form = c.read(entityFormProvider(category).notifier);
      form.patch({'name': '  Mascotas ', 'notes': ' '});
      await form.save();
      expect(writes.single.method, 'POST');
      expect(writes.single.path, '/api/categories');
      expect(writes.single.data, {'name': 'Mascotas', 'notes': null});
      expect(env.toast.messages.map((m) => m.toString()), ['success: Category created']);
      expect(env.back.fallbacks, [entityFormFallback]);
    });

    test('does not save an empty name', () async {
      final (env, c, writes) = await setup();
      await open(c, category);
      await c.read(entityFormProvider(category).notifier).save();
      expect(writes, isEmpty);
      final view = c.read(entityFormViewProvider(category));
      expect(view.clientErrors, {'name': 'required'});
      expect(view.errorsFor('name'), ['This field is required.']);
      expect(env.back.fallbacks, isEmpty);
    });

    test('shows no client error before the first save', () async {
      final (_, c, _) = await setup();
      await open(c, category);
      expect(c.read(entityFormViewProvider(category)).errorsFor('name'), isEmpty);
    });

    test('puts the server’s message on its field, and clears it when the field is edited', () async {
      final s = server(handlers: {'POST /api/categories': (o) => jsonBody({'error': 'validation', 'message': 'x', 'fields': {'name': ['Already in use.'], 'other': ['Odd.']}}, 422)});
      final env = TestEnv(config: signedInConfig, adapter: s.adapter);
      final c = env.container();
      await open(c, category);
      final form = c.read(entityFormProvider(category).notifier);
      form.set('name', 'Comida');
      await form.save();
      var view = c.read(entityFormViewProvider(category));
      expect(view.errorsFor('name'), ['Already in use.']);
      expect(view.generalErrors, ['Odd.'], reason: 'a field the form does not have');
      expect(env.back.fallbacks, isEmpty);
      form.set('name', 'Comidas');
      view = c.read(entityFormViewProvider(category));
      expect(view.errorsFor('name'), isEmpty);
    });

    test('says the network failed or the server broke with a toast', () async {
      final s = server(handlers: {'POST /api/categories': (o) => jsonBody({'error': 'x'}, 500)});
      final env = TestEnv(config: signedInConfig, adapter: s.adapter);
      final c = env.container();
      await open(c, category);
      final form = c.read(entityFormProvider(category).notifier);
      form.set('name', 'Comida');
      await form.save();
      expect(env.toast.messages.single.kind, 'error');
      expect(c.read(entityFormProvider(category)).saving, isFalse);
    });

    test('loads a record to edit, and reports a missing one', () async {
      final (_, c, _) = await setup();
      const tag = (kind: EntityKind.tag, id: '4', accountType: null);
      await open(c, tag);
      var data = c.read(entityFormProvider(tag));
      expect(data.status, EntityFormStatus.ready);
      expect(data.model, {'tag': 'viaje', 'date': '', 'description': 'x'});
      const missing = (kind: EntityKind.tag, id: '99', accountType: null);
      await open(c, missing);
      data = c.read(entityFormProvider(missing));
      expect(data.status, EntityFormStatus.missing);
    });

    test('asks before deleting and only deletes once confirmed', () async {
      final (env, c, writes) = await setup();
      const edit = (kind: EntityKind.category, id: '4', accountType: null);
      await open(c, edit);
      final form = c.read(entityFormProvider(edit).notifier);
      env.confirm.answer = false;
      await form.remove();
      expect(writes, isEmpty);
      expect(env.confirm.asked.single.destructive, isTrue);
      expect(env.confirm.asked.single.message, contains('Comida'));
      expect(env.confirm.asked.single.requireText, isNull);
      env.confirm.answer = true;
      await form.remove();
      expect(writes.single.method, 'DELETE');
      expect(writes.single.path, '/api/categories/4');
      expect(env.toast.messages.single.message, 'Category deleted');
      expect(env.back.fallbacks, [entityFormFallback]);
    });

    test('updates an existing record instead of creating one', () async {
      final (env, c, writes) = await setup();
      const edit = (kind: EntityKind.category, id: '4', accountType: null);
      await open(c, edit);
      final form = c.read(entityFormProvider(edit).notifier);
      form.set('name', 'Comidas');
      await form.save();
      expect((writes.single.method, writes.single.path), ('PUT', '/api/categories/4'));
      expect(env.toast.messages.single.message, 'Category updated');
    });

    test('sends the automatic budget only when it is on', () async {
      final (_, c, writes) = await setup();
      const budget = (kind: EntityKind.budget, id: null, accountType: null);
      await open(c, budget);
      final form = c.read(entityFormProvider(budget).notifier);
      form.patch({'name': 'Hogar', 'auto': true, 'autoAmount': ''});
      await form.save();
      expect(writes, isEmpty);
      expect(c.read(entityFormViewProvider(budget)).clientErrors, {'autoAmount': 'required'});
      form.set('autoAmount', '5000');
      await form.save();
      expect(writes.single.data, containsPair('autoBudget', {'type': 'reset', 'amount': '5000', 'period': 'monthly', 'currency': 'DOP'}));
      form.set('auto', false);
    });

    test('a budget without automatic budget sends none', () {
      final request = const BudgetSpec().toRequest({...const BudgetSpec().blank(const EntityContext(primaryCurrency: 'DOP')), 'name': ' Ocio '});
      expect(request, {'name': 'Ocio', 'active': true, 'notes': null, 'autoBudget': null});
    });

    test('a subscription with a fixed amount sends it as both the minimum and the maximum', () {
      const spec = BillSpec();
      final m = {...spec.blank(const EntityContext(primaryCurrency: 'DOP')), 'name': 'Luz', 'amountMin': '1500', 'amountMax': '9'};
      expect(spec.toRequest(m), containsPair('amountMax', '1500'));
      expect(spec.toRequest({...m, 'fixed': false}), containsPair('amountMax', '9'));
    });

    test('checks a subscription’s amounts and dates', () {
      const spec = BillSpec();
      final blank = spec.blank(const EntityContext(primaryCurrency: 'DOP'));
      expect(spec.validate(blank, isEdit: false), {'name': 'required', 'amountMin': 'required'});
      final ranged = {...blank, 'name': 'Luz', 'fixed': false, 'amountMin': '100', 'amountMax': '50', 'date': '2026-09-01', 'endDate': '2026-09-01', 'skip': 40};
      expect(spec.validate(ranged, isEdit: false), {'amountMax': 'range', 'endDate': 'endDate', 'skip': 'max'});
      expect(spec.validate({...ranged, 'amountMax': '', 'date': 'nope', 'endDate': 'nope', 'skip': -1}, isEdit: false), {'amountMax': 'required', 'date': 'date', 'endDate': 'date', 'skip': 'min'});
      expect(spec.validate({...ranged, 'amountMax': '150', 'endDate': '2027-01-01', 'skip': 0}, isEdit: false), isEmpty);
    });

    test('checks a tag’s date', () {
      const spec = TagSpec();
      expect(spec.validate({'tag': 'a', 'date': '2026-02-30', 'description': ''}, isEdit: false), {'date': 'date'});
      expect(spec.validate({'tag': 'a', 'date': '', 'description': ''}, isEdit: false), isEmpty);
      expect(spec.toRequest({'tag': ' viaje ', 'date': '', 'description': ' '}), {'tag': 'viaje', 'date': null, 'description': null});
    });

    test('limits the length of the text fields', () {
      expect(const CategorySpec().validate({'name': 'x' * 256, 'notes': 'y' * 65001}, isEdit: false), {'name': 'maxlength', 'notes': 'maxlength'});
    });
  });

  group('account form', () {
    test('starts a new account as the kind it was opened for', () async {
      final (_, c, _) = await setup();
      const expense = (kind: EntityKind.account, id: null, accountType: 'expense');
      await open(c, expense);
      c.listen(editorLookupsProvider, (_, __) {});
      final view = c.read(entityFormViewProvider(expense));
      expect(view.model.text('type'), 'expense');
      expect((view.isAsset, view.isOwned, view.isEdit), (false, false, false));
      const asset = (kind: EntityKind.account, id: null, accountType: 'asset');
      await open(c, asset);
      expect(c.read(entityFormViewProvider(asset)).isOwned, isTrue);
      const bogus = (kind: EntityKind.account, id: null, accountType: 'nonsense');
      await open(c, bogus);
      expect(c.read(entityFormViewProvider(bogus)).model.text('type'), 'asset');
    });

    test('loads an account, locks its kind and asks to type its name to delete it', () async {
      final (env, c, writes) = await setup();
      const edit = (kind: EntityKind.account, id: '5', accountType: null);
      await open(c, edit);
      final view = c.read(entityFormViewProvider(edit));
      expect((view.isEdit, view.isAsset, view.isCard), (true, true, true));
      expect(view.model.number('paymentDay'), 17);
      expect(view.model.number('transactionCount'), 12);
      await c.read(entityFormProvider(edit).notifier).remove();
      final asked = env.confirm.asked.single;
      expect(asked.requireText, 'Banco Popular');
      expect(asked.message, contains('12 transactions'));
      expect(writes.single.path, '/api/accounts/5');
    });

    test('only sends what the kind uses', () {
      const spec = AccountSpec();
      final asset = {...spec.blank(const EntityContext(primaryCurrency: 'DOP')), 'name': ' Visa ', 'role': 'ccAsset', 'paymentDay': 5, 'openingBalance': '-20', 'openingBalanceDate': '2026-01-01', 'iban': ' '};
      final request = spec.toRequest(asset);
      expect(request, containsPair('role', 'ccAsset'));
      expect(request['monthlyPaymentDate'], paymentDate(5));
      expect(request, containsPair('openingBalance', '-20'));
      expect(request, containsPair('liabilityType', null));
      expect(request, containsPair('iban', null));
      final expense = spec.toRequest({...asset, 'type': 'expense'});
      expect([expense['currency'], expense['role'], expense['monthlyPaymentDate'], expense['openingBalance']], [null, null, null, null]);
      final loan = spec.toRequest({...asset, 'type': 'liability', 'interest': ' 5.5 '});
      expect([loan['liabilityType'], loan['liabilityDirection'], loan['interest'], loan['interestPeriod'], loan['role']], ['loan', 'debit', '5.5', 'monthly', null]);
    });

    test('checks the payment day, interest and opening balance', () {
      const spec = AccountSpec();
      final blank = spec.blank(const EntityContext(primaryCurrency: 'DOP'));
      final card = {...blank, 'name': 'Visa', 'role': 'ccAsset', 'paymentDay': 0, 'openingBalance': 'abc'};
      expect(spec.validate(card, isEdit: false), {'paymentDay': 'day', 'openingBalance': 'amount', 'openingBalanceDate': 'required'});
      expect(spec.validate({...blank, 'name': 'Visa', 'openingBalance': '10'}, isEdit: false), {'openingBalanceDate': 'required'});
      expect(spec.validate({...blank, 'name': 'Visa', 'openingBalance': '10', 'openingBalanceDate': '2026-13-01'}, isEdit: false), {'openingBalanceDate': 'date'});
      expect(spec.validate({...blank, 'type': 'liability', 'name': 'P', 'interest': 'x'}, isEdit: false), {'interest': 'interest'});
      expect(spec.validate({...blank, 'type': 'expense', 'name': 'P', 'interest': 'x'}, isEdit: false), isEmpty);
    });

    test('puts a card’s payment day inside the current month', () {
      final now = DateTime.utc(2026, 2, 10);
      expect(paymentDate(31, now), '2026-02-28');
      expect(paymentDate(0, now), '2026-02-01');
      expect(paymentDate(99, now).substring(0, 7), '2026-02');
      expect(paymentDate(15, now), '2026-02-15');
    });
  });

  group('goal form', () {
    const piggy = (kind: EntityKind.piggy, id: null, accountType: null);

    test('lets the first account decide the goal’s currency, and never goes below zero when removing money', () async {
      final (_, c, writes) = await setup();
      await open(c, piggy);
      c.listen(editorLookupsProvider, (_, __) {});
      await c.read(editorLookupsProvider.future);
      final form = c.read(entityFormProvider(piggy).notifier);
      expect(c.read(entityFormViewProvider(piggy)).piggyAccountOptions.map((o) => o.value), ['1', '2']);
      form.addAccount('2');
      var view = c.read(entityFormViewProvider(piggy));
      expect(view.model.text('currency'), 'USD');
      expect(view.piggyAccountOptions, isEmpty, reason: 'the only other asset is in another currency');
      form.setAccountField(0, 'currentAmount', '10.00');
      form.setAccountField(0, 'adjust', '25');
      expect(canAdjust(c.read(entityFormProvider(piggy)).model, 0), isTrue);
      form.adjust(0, -1);
      expect(c.read(entityFormProvider(piggy)).model.rows('accounts')[0], {'accountId': '2', 'currentAmount': '0.00', 'adjust': ''});
      form.adjust(0, 1);
      expect(c.read(entityFormProvider(piggy)).model.rows('accounts')[0]['currentAmount'], '0.00', reason: 'nothing typed: nothing happens');
      form.setAccountField(0, 'adjust', '1.234,50');
      form.adjust(0, 1);
      expect(c.read(entityFormProvider(piggy)).model.rows('accounts')[0]['currentAmount'], '1234.50');
      form.set('name', 'Viaje');
      await form.save();
      expect(writes.single.data, containsPair('accounts', [{'accountId': '2', 'currentAmount': '1234.50'}]));
      expect(writes.single.data, containsPair('currency', 'USD'));
      view = c.read(entityFormViewProvider(piggy));
      form.removeAccount(0);
      expect(c.read(entityFormProvider(piggy)).model.rows('accounts'), isEmpty);
    });

    test('needs at least one account and a valid amount in each', () {
      const spec = PiggySpec();
      final blank = {...spec.blank(const EntityContext(primaryCurrency: 'DOP')), 'name': 'Viaje'};
      expect(spec.validate(blank, isEdit: false), {'accounts': 'accounts'});
      final rows = {
        ...blank,
        'accounts': [
          {'accountId': '1', 'currentAmount': 'x', 'adjust': ''},
        ],
      };
      expect(spec.validate(rows, isEdit: false), {'accounts.0': 'amount'});
      expect(spec.validate({...rows, 'targetDate': '2026-01-01', 'startDate': '2026-02-01', 'targetAmount': '-5'}, isEdit: false), {'accounts.0': 'amount', 'targetAmount': 'positive', 'targetDate': 'endDate'});
    });
  });

  group('parseAmount', () {
    test('reads what people type', () {
      expect(parseAmount('1,234.56'), '1234.56');
      expect(parseAmount('1.234,56'), '1234.56');
      expect(parseAmount('1234,5'), '1234.5');
      expect(parseAmount('  -12 '), '-12');
      expect(parseAmount('+7'), '7');
      expect(parseAmount('1,234'), '1234', reason: 'three digits after a lone separator that is not the decimal mark');
      expect(parseAmount('1,234', decimal: ','), '1.234');
      expect(parseAmount('-0'), '0');
      expect(parseAmount('007.5'), '7.5');
    });

    test('rejects what is not a number', () {
      for (final bad in ['', 'abc', '1.2.3,4', '12,34,5', '1,2345,678', '.', '1a']) {
        expect(parseAmount(bad), isNull, reason: bad);
      }
    });
  });

  group('account order', () {
    test('moves an id one place, and not past the ends', () {
      const order = ['a', 'b', 'c', 'd'];
      expect(moveId(order, 'b', -1), ['b', 'a', 'c', 'd']);
      expect(moveId(order, 'c', 1), ['a', 'b', 'd', 'c']);
      expect(moveId(order, 'a', -1), order);
      expect(moveId(order, 'd', 1), order);
      expect(moveId(order, 'zz', 1), order);
    });

    test('drops an id on another: down lands after it, up lands before it', () {
      const order = ['a', 'b', 'c', 'd'];
      expect(dropId(order, 'a', 'c'), ['b', 'c', 'a', 'd']);
      expect(dropId(order, 'd', 'b'), ['a', 'd', 'b', 'c']);
      expect(dropId(order, 'b', 'b'), order);
    });

    Future<(TestEnv, ProviderContainer, List<RequestOptions>)> open2() async {
      final (env, c, writes) = await setup();
      c.listen(accountsViewModelProvider, (_, __) {});
      await c.read(accountsReportProvider.future);
      return (env, c, writes);
    }

    test('shows the server’s order until the user gives one, and keeps what it does not name last', () async {
      final (_, c, _) = await open2();
      expect(c.read(accountsViewModelProvider).rows.map((a) => a.id), ['1', '2']);
      c.read(accountOrderProvider.notifier).state = ['2'];
      expect(c.read(accountsViewModelProvider).rows.map((a) => a.id), ['2', '1']);
      c.read(accountOrderProvider.notifier).state = ['9', '2', '1'];
      expect(c.read(accountsViewModelProvider).rows.map((a) => a.id), ['2', '1'], reason: 'an account that is gone is skipped');
    });

    test('moving saves the new order, at once and on the server', () async {
      final (env, c, writes) = await open2();
      await c.read(accountsViewModelProvider).move('2', -1);
      expect(c.read(accountsViewModelProvider).rows.map((a) => a.id), ['2', '1']);
      expect((writes.single.method, writes.single.path), ('PUT', '/api/settings/account-order'));
      expect(writes.single.data, {'order': ['2', '1']});
      writes.clear();
      await c.read(accountsViewModelProvider).move('2', -1);
      expect(writes, isEmpty, reason: 'already first');
      expect(env.toast.messages, isEmpty);
    });

    test('a drag in the reorderable list lands where Flutter says', () async {
      final (_, c, writes) = await open2();
      // Flutter reports the index the row would have if the dragged one were still there: moving the first below the second is "to 2"
      await c.read(accountsViewModelProvider).reorder(0, 2);
      expect(writes.single.data, {'order': ['2', '1']});
      writes.clear();
      await c.read(accountsViewModelProvider).reorder(1, 0);
      expect(writes.single.data, {'order': ['1', '2']});
      writes.clear();
      await c.read(accountsViewModelProvider).reorder(0, 1);
      expect(writes, isEmpty, reason: 'dropped where it was');
    });

    test('resetting asks the server for its default order and forgets the user’s', () async {
      final (_, c, writes) = await open2();
      await c.read(accountsViewModelProvider).move('2', -1);
      writes.clear();
      await c.read(accountsViewModelProvider).reset();
      expect(writes.first.data, {'order': <String>[]});
      expect(c.read(accountOrderProvider), isNull);
    });

    test('says so when the order could not be saved', () async {
      final s = server(handlers: {'PUT /api/settings/account-order': (o) => jsonBody({'error': 'x'}, 500)});
      final env = TestEnv(config: signedInConfig, adapter: s.adapter);
      final c = env.container();
      c.listen(accountsViewModelProvider, (_, __) {});
      await c.read(accountsReportProvider.future);
      await c.read(accountsViewModelProvider).move('2', -1);
      expect(env.toast.messages.single.kind, 'error');
    });
  });
}
