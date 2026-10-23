import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide AccountInput, Ref;
import 'package:spacefly_mobile/features/editor/account_picker_vm.dart';
import 'package:spacefly_mobile/features/editor/transaction_form_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/editor_lookups.dart';

import 'fixtures.dart';
import 'support.dart';

final _now = DateTime(2026, 9, 15, 14, 30);

TxEditPayload payload([Map<String, Object?>? over]) => TxEditPayload.fromJson({...txFormJson(), ...?over});

Map<String, Object?> txFormJson() => {
      'groupId': '5',
      'journalId': '5',
      'type': 'withdrawal',
      'currency': 'DOP',
      'description': 'Cena',
      'date': '2026-09-02',
      'time': '20:15',
      'source': {'id': '1', 'name': 'Banco Popular', 'kind': 'asset'},
      'destination': {'id': '20', 'name': 'Supermercado', 'kind': 'expense'},
      'amount': '120.50',
      'foreignAmount': '2.00',
      'foreignCurrency': 'USD',
      'category': 'Comida',
      'budgetId': '1',
      'billId': null,
      'tags': ['hogar'],
      'notes': null,
    };

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  group('transaction form shaping', () {
    test('turns a stored transaction into a form model and back into the same request', () {
      final model = txModelFromPayload(payload());
      expect((model.description, model.otherCurrency, model.foreignCurrency, model.notes, model.billId), ('Cena', true, 'USD', '', ''));
      expect(model.source, const AccountInput.id('1'));
      final request = buildTxRequest(model, TxKind.WITHDRAWAL, (amount: model.foreignAmount, currency: model.foreignCurrency));
      expect(request, {
        'description': 'Cena',
        'date': '2026-09-02',
        'time': '20:15',
        'source': {'id': '1'},
        'destination': {'id': '20'},
        'amount': '120.50',
        'foreignAmount': '2.00',
        'foreignCurrency': 'USD',
        'category': 'Comida',
        'budgetId': '1',
        'billId': null,
        'tags': ['hogar'],
        'notes': null,
      });
    });

    test('drops the padding zeros Firefly stores amounts with', () {
      final model = txModelFromPayload(payload({'amount': '12800.00000000', 'foreignAmount': '0.12345600'}));
      expect([model.amount, model.foreignAmount], ['12800.00', '0.123456']);
    });

    test('a transfer never has an "other currency"', () {
      expect(txModelFromPayload(payload({'type': 'transfer'})).otherCurrency, isFalse);
      expect(txModelFromPayload(payload({'foreignAmount': null, 'foreignCurrency': null})).otherCurrency, isFalse);
    });

    test('keeps budget and bill only on expenses and trims text', () {
      final m = blankTxModel(_now).copyWith(description: '  hola ', source: const AccountInput.id('1'), destination: const AccountInput.id('2'), amount: '5', budgetId: '9', billId: '3', notes: '  ', category: ' x ', time: '9');
      final deposit = buildTxRequest(m, TxKind.DEPOSIT, null);
      expect((deposit['description'], deposit['budgetId'], deposit['billId'], deposit['notes'], deposit['category'], deposit['time'], deposit['foreignAmount']), ('hola', null, null, null, 'x', '09:00', null));
      final expense = buildTxRequest(m, TxKind.WITHDRAWAL, null);
      expect((expense['budgetId'], expense['billId']), ('9', '3'));
    });

    test('defaults to the default account and today, then lets the query string win', () {
      TxModel build(TxQueryValues? q) => withDefaults(blankTxModel(_now), accountIds: {'1', '20'}, defaultAccountId: '1', query: q, now: _now);
      final plain = build(null);
      expect((plain.source, plain.destination, plain.date, plain.time), (const AccountInput.id('1'), null, '2026-09-15', '14:30'));

      final m = build(const TxQueryValues(source: '1', destination: 'Colmado nuevo', date: '2026-01-05', amount: '10.5', description: 'Pan', category: 'Comida', budget: '4'));
      expect((m.source, m.destination, m.date, m.amount, m.description, m.category, m.budgetId), (const AccountInput.id('1'), const AccountInput.name('Colmado nuevo'), '2026-01-05', '10.5', 'Pan', 'Comida', '4'));

      final bad = build(const TxQueryValues(date: 'not-a-date', amount: '-3'));
      expect((bad.amount, bad.date), ('', '2026-09-15'));
    });

    test('words every validation kind the catalog has, and the server\'s own message', () {
      expect(formErrorText(t, const FieldError('required')), 'This field is required.');
      expect(formErrorText(t, const FieldError('positive')), 'Enter an amount greater than zero.');
      expect(formErrorText(t, const FieldError('combination')), "These two accounts can't be combined.");
      expect(formErrorText(t, const FieldError('whatever')), 'The value is not valid.');
      expect(formErrorText(t, const FieldError('server', 'Already exists')), 'Already exists');
    });

    test('reads the pre-fill of a query string', () {
      final q = TxQueryValues.fromMap({'source': '1', 'amount': '5'});
      expect((q.source, q.amount, q.destination), ('1', '5', null));
      expect(const TxFormArgs(id: '5') == const TxFormArgs(id: '5'), isTrue);
      expect(const TxFormArgs(id: '5') == const TxFormArgs(id: '6'), isFalse);
    });
  });

  group('transactionFormViewModel', () {
    late TestEnv env;
    late FakeAdapter adapter;
    late ProviderContainer c;
    final saved = <Map<String, Object?>>[];

    /// Answers by method and path; [handlers] adds to or overrides the defaults.
    Future<TxFormArgs> setup({String? id, TxQueryValues query = const TxQueryValues(), Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) async {
      saved.clear();
      adapter = FakeAdapter((o) {
        final key = '${o.method} ${o.path}';
        final custom = handlers[key];
        if (custom != null) return custom(o);
        if (o.method == 'POST' || o.method == 'PUT') saved.add({'method': o.method, 'path': o.path, 'body': o.data});
        return switch (key) {
          'GET /api/lookups/editor' => jsonBody(editorLookupsJson()),
          'GET /api/meta' => jsonBody(metaJson()),
          'GET /api/transactions/5' => jsonBody(txFormJson()),
          'POST /api/transactions' => jsonBody({'groupId': '9', 'journalId': '9', 'type': 'withdrawal'}, 201),
          'PUT /api/transactions/5' => jsonBody({'groupId': '5', 'journalId': '5', 'type': 'withdrawal'}),
          'DELETE /api/transactions/5' => ResponseBody.fromString('', 204),
          _ => jsonBody({'error': 'not_found'}, 404),
        };
      });
      env = TestEnv(config: signedInConfig, adapter: adapter);
      c = env.container([suggestionDebounceProvider.overrideWithValue(Duration.zero)]);
      final args = TxFormArgs(id: id, query: query);
      c.listen(txFormViewProvider(args), (_, __) {});
      c.listen(txFormProvider(args), (_, __) {});
      await c.read(editorLookupsProvider.future);
      await pumpEventQueue();
      return args;
    }

    TxFormView view(TxFormArgs args) => c.read(txFormViewProvider(args));
    TxFormNotifier form(TxFormArgs args) => c.read(txFormProvider(args).notifier);

    Future<void> fillExpense(TxFormArgs args, {String amount = '50'}) async {
      form(args)
        ..setDescription('Cena')
        ..setDestination(const AccountInput.id('20'))
        ..setAmount(amount);
    }

    test('starts on the default account and today, and finds the type from the two accounts', () async {
      final args = await setup();
      expect(view(args).model.source, const AccountInput.id('1'));
      expect(view(args).model.date, '2026-09-15');
      expect(view(args).type, isNull, reason: 'no destination yet');
      expect((view(args).typePending, view(args).typeInvalid), (true, false), reason: 'the badge says "pick the accounts"');
      form(args).setDestination(const AccountInput.id('20'));
      expect((view(args).typePending, view(args).typeInvalid), (false, false));
      expect(view(args).type, TxKind.WITHDRAWAL);
      expect(view(args).showBudgetBill, isTrue);
      expect(view(args).showOtherCurrency, isTrue);
      form(args).setSource(const AccountInput.id('10'));
      expect(view(args).type, isNull, reason: 'a revenue account can not pay an expense account');
      expect((view(args).typePending, view(args).typeInvalid), (false, true), reason: 'the badge warns about the combination');
      form(args).setSource(const AccountInput.name('Alguien'));
      form(args).setDestination(const AccountInput.id('1'));
      expect(view(args).type, TxKind.DEPOSIT);
      expect(view(args).showBudgetBill, isFalse);
    });

    test('pre-fills from the query string', () async {
      final args = await setup(query: const TxQueryValues(destination: '20', amount: '10.5', description: 'Pan', budget: '1'));
      final m = view(args).model;
      expect((m.destination, m.amount, m.description, m.budgetId), (const AccountInput.id('20'), '10.5', 'Pan', '1'));
      expect(view(args).type, TxKind.WITHDRAWAL);
    });

    test('saves a new expense, tells the user and goes back', () async {
      final args = await setup();
      await fillExpense(args);
      await form(args).save();

      expect(saved.single['method'], 'POST');
      expect(saved.single['path'], '/api/transactions');
      final body = saved.single['body'] as Map;
      expect((body['description'], body['amount'], body['date']), ('Cena', '50', '2026-09-15'));
      expect(body['source'], {'id': '1'});
      expect(body['destination'], {'id': '20'});
      expect(env.toast.messages.single.kind, 'success');
      expect(env.toast.messages.single.message, 'Transaction created');
      expect(env.back.fallbacks, ['/transactions']);
      await pumpEventQueue();
      expect(adapter.requests.where((r) => r.path == '/api/lookups/editor').length, 2, reason: 'a write refreshes the lookups');
    });

    test('does not send an incomplete form, and shows what is missing from then on', () async {
      final args = await setup();
      expect(view(args).errorsFor('description'), isEmpty, reason: 'nothing is shown before a save is tried');
      await form(args).save();
      expect(saved, isEmpty);
      expect(view(args).errorsFor('description'), ['This field is required.']);
      expect(view(args).errorsFor('destination'), ['This field is required.']);
      expect(view(args).errorsFor('amount'), ['This field is required.']);
      expect(view(args).errorsFor('source'), isEmpty);
      expect(view(args).firstErrorField, 'description');

      form(args).setAmount('0');
      expect(view(args).errorsFor('amount'), ['Enter an amount greater than zero.']);
      form(args).setDate('2026-02-31');
      expect(view(args).errorsFor('date'), ['Pick a valid date.']);
      form(args).setTime('25:00');
      expect(view(args).errorsFor('time'), ['Enter a valid time, like 18:30.']);
      form(args).setTime('');
      expect(view(args).errorsFor('time'), isEmpty, reason: 'the time is optional');
    });

    test('refuses a pair of accounts that make no transaction', () async {
      final args = await setup();
      form(args)
        ..setSource(const AccountInput.id('10'))
        ..setDestination(const AccountInput.id('20'))
        ..setDescription('x')
        ..setAmount('5');
      await form(args).save();
      expect(saved, isEmpty);
      expect(view(args).errorsFor('destination'), ["These two accounts can't be combined."]);
    });

    test('asks for the received amount of a cross-currency transfer, and sends it in the destination currency', () async {
      final args = await setup();
      form(args)
        ..setDestination(const AccountInput.id('2'))
        ..setDescription('Cambio')
        ..setAmount('6100');
      final v = view(args);
      expect((v.type, v.crossCurrency, v.receivedCurrency, v.amountCurrency), (TxKind.TRANSFER, true, 'USD', 'DOP'));
      await form(args).save();
      expect(saved, isEmpty);
      expect(view(args).errorsFor('foreignAmount'), ['Enter the received amount.']);

      form(args).setForeignAmount('100');
      await form(args).save();
      final body = saved.single['body'] as Map;
      expect((body['foreignAmount'], body['foreignCurrency'], body['amount']), ('100', 'USD', '6100'));
    });

    test('an expense in another currency needs its currency and amount, from the currencies other than its own', () async {
      final args = await setup();
      await fillExpense(args);
      expect(view(args).foreignRequired, isFalse);
      form(args).setOtherCurrency(true);
      expect(view(args).foreignRequired, isTrue);
      expect(view(args).otherCurrencyOptions.map((o) => o.value), ['USD'], reason: 'DOP is the amount currency');
      await form(args).save();
      expect(view(args).errorsFor('foreignAmount'), ['Enter the received amount.']);
      expect(view(args).errorsFor('foreignCurrency'), ['This field is required.']);

      form(args)
        ..setForeignCurrency('USD')
        ..setForeignAmount('3');
      await form(args).save();
      final body = saved.single['body'] as Map;
      expect((body['foreignAmount'], body['foreignCurrency']), ('3', 'USD'));
    });

    test('the amount of an income is in the destination account currency', () async {
      final args = await setup();
      form(args)
        ..setSource(const AccountInput.id('10'))
        ..setDestination(const AccountInput.id('2'));
      expect(view(args).amountCurrency, 'USD');
    });

    test('puts the server\'s field messages under the fields, until the field is edited', () async {
      final args = await setup(handlers: {
        'POST /api/transactions': (_) => jsonBody({'error': 'validation', 'message': 'x', 'fields': {'amount': ['Too much.'], 'unknown': ['Something else.']}}, 422),
      });
      await fillExpense(args);
      await form(args).save();
      expect(env.back.fallbacks, isEmpty);
      expect(view(args).errorsFor('amount'), ['Too much.']);
      expect(view(args).generalErrors, ['Something else.']);
      expect(view(args).data.saving, isFalse);

      form(args).setAmount('40');
      expect(view(args).errorsFor('amount'), isEmpty);
    });

    test('says so when the server is unreachable or fails, and keeps the form', () async {
      final network = await setup(handlers: {'POST /api/transactions': (_) => jsonBody({}, 504)});
      await fillExpense(network);
      await form(network).save();
      expect(env.toast.messages.single.kind, 'error');
      expect(env.toast.messages.single.message, t.editor.networkError);
      expect(view(network).model.description, 'Cena');

      final other = await setup(handlers: {'POST /api/transactions': (_) => jsonBody({}, 500)});
      await fillExpense(other);
      await form(other).save();
      expect(env.toast.messages.single.message, 'Something went wrong. Please try again.');
    });

    test('empties the form after saving when asked to stay and reset, keeping the account default', () async {
      final args = await setup();
      form(args).setAfter((a) => a.copyWith(stay: true));
      await fillExpense(args);
      await form(args).save();
      expect(env.back.fallbacks, isEmpty);
      final v = view(args);
      expect((v.model.description, v.model.amount, v.model.destination, v.model.source), ('', '', null, const AccountInput.id('1')));
      expect((v.data.resetTick, v.data.submitted), (1, false));
      expect(env.toast.messages.single.kind, 'success');
    });

    test('keeps the data after saving when asked to stay without resetting', () async {
      final args = await setup();
      form(args).setAfter((a) => const AfterSave(stay: true, reset: false));
      await fillExpense(args);
      await form(args).save();
      expect(view(args).model.description, 'Cena');
      expect(env.back.fallbacks, isEmpty);
    });

    test('remembers what to do after saving across restarts', () async {
      final args = await setup();
      form(args).setAfter((a) => const AfterSave(stay: true, reset: false));
      final other = env.container();
      expect(other.read(txFormProvider(args)).after.stay, isTrue);
      expect(other.read(txFormProvider(args)).after.reset, isFalse);
    });

    test('swaps the two accounts', () async {
      final args = await setup();
      form(args).setDestination(const AccountInput.id('2'));
      form(args).swap();
      expect((view(args).model.source, view(args).model.destination), (const AccountInput.id('2'), const AccountInput.id('1')));
    });

    test('words the account fields for the picker', () async {
      final args = await setup();
      form(args).setDestination(const AccountInput.name('Colmado nuevo'));
      expect(view(args).accountLabel(view(args).model.source), 'Banco Popular');
      expect(view(args).accountLabel(view(args).model.destination), 'Colmado nuevo');
      expect(view(args).accountLabel(null), '');
      expect(view(args).picker(AccountSide.destination).createInvalid, isFalse);
      expect(view(args).categoryOptions.map((o) => o.value), ['Comida']);
      expect(view(args).budgetOptions.map((o) => o.label), ['Hogar']);
      expect(view(args).billOptions.map((o) => o.label), ['Luz']);
      expect(view(args).tagNames, ['hogar']);
    });

    test('looks up earlier descriptions once typing pauses, and clears them with the text', () async {
      final args = await setup(handlers: {'GET /api/lookups/descriptions': (o) => jsonBody(['Cena familiar', 'Cena fuera'])});
      form(args).onDescriptionTyped('  cena ');
      await pumpEventQueue();
      await c.read(descriptionSuggestionsProvider(args).future);
      expect(adapter.requests.lastWhere((r) => r.path == '/api/lookups/descriptions').queryParameters, {'q': 'cena'});
      expect(view(args).descriptionOptions, ['Cena familiar', 'Cena fuera']);

      form(args).onDescriptionTyped('   ');
      expect(view(args).descriptionOptions, isEmpty);
    });

    group('editing', () {
      test('loads the transaction and saves changes to it', () async {
        final args = await setup(id: '5');
        await pumpEventQueue();
        final v = view(args);
        expect((v.data.status, v.data.recordTitle, v.isEdit), (TxFormStatus.ready, 'Cena', true));
        expect((v.model.description, v.model.amount, v.model.time), ('Cena', '120.50', '20:15'));
        expect(v.model.tags, ['hogar']);

        form(args).setAmount('99.99');
        await form(args).save();
        final put = saved.singleWhere((r) => r['method'] == 'PUT');
        expect(put['path'], '/api/transactions/5');
        expect((put['body'] as Map)['amount'], '99.99');
        expect(env.toast.messages.single.message, 'Transaction updated');
        expect(env.back.fallbacks, ['/transactions']);
      });

      test('keeps the name and the kind of an account the lists no longer have (an inactive one), so it can still be saved', () async {
        final json = {...txFormJson(), 'destination': {'id': 'old', 'name': 'Colmado viejo', 'kind': 'expense'}};
        final args = await setup(id: '5', handlers: {'GET /api/transactions/5': (_) => jsonBody(json)});
        await pumpEventQueue();
        expect(view(args).accountLabel(view(args).model.destination), 'Colmado viejo');
        expect(view(args).type, TxKind.WITHDRAWAL);
        expect(view(args).clientErrors, isEmpty);
        await form(args).save();
        expect(saved.singleWhere((r) => r['method'] == 'PUT')['path'], '/api/transactions/5');
      });

      test('reloads what Firefly stored when asked to stay', () async {
        final args = await setup(id: '5');
        await pumpEventQueue();
        form(args).setAfter((a) => a.copyWith(stay: true));
        final before = adapter.requests.where((r) => r.method == 'GET' && r.path == '/api/transactions/5').length;
        await form(args).save();
        expect(adapter.requests.where((r) => r.method == 'GET' && r.path == '/api/transactions/5').length, before + 1);
        expect(env.back.fallbacks, isEmpty);
      });

      test('says why a transaction can not be edited, that it does not exist, or that loading failed', () async {
        final split = await setup(id: '5', handlers: {'GET /api/transactions/5': (_) => jsonBody({'reason': 'splits'}, 409)});
        await pumpEventQueue();
        expect((view(split).data.status, view(split).data.blockedReason), (TxFormStatus.notEditable, 'splits'));

        final missing = await setup(id: '5', handlers: {'GET /api/transactions/5': (_) => jsonBody({}, 404)});
        await pumpEventQueue();
        expect(view(missing).data.status, TxFormStatus.missing);

        final broken = await setup(id: '5', handlers: {'GET /api/transactions/5': (_) => jsonBody({}, 500)});
        await pumpEventQueue();
        expect(view(broken).data.status, TxFormStatus.error);
      });

      test('turns into "not editable" when the server refuses the save for that reason', () async {
        final args = await setup(id: '5', handlers: {'PUT /api/transactions/5': (_) => jsonBody({'reason': 'type'}, 409)});
        await pumpEventQueue();
        await form(args).save();
        expect((view(args).data.status, view(args).data.blockedReason), (TxFormStatus.notEditable, 'type'));
      });

      test('asks before deleting and only deletes on yes', () async {
        final args = await setup(id: '5');
        await pumpEventQueue();
        env.confirm.answer = false;
        await form(args).remove();
        expect(adapter.requests.where((r) => r.method == 'DELETE'), isEmpty);
        expect(env.confirm.asked.single.destructive, isTrue);
        expect(env.confirm.asked.single.message, contains('Cena'));

        env.confirm.answer = true;
        await form(args).remove();
        expect(adapter.requests.where((r) => r.method == 'DELETE').single.path, '/api/transactions/5');
        expect(env.toast.messages.single.message, 'Transaction deleted');
        expect(env.back.fallbacks, ['/transactions']);
      });

      test('reports a failed delete and stays', () async {
        final args = await setup(id: '5', handlers: {'DELETE /api/transactions/5': (_) => jsonBody({}, 500)});
        await pumpEventQueue();
        await form(args).remove();
        expect(env.toast.messages.single.kind, 'error');
        expect(env.back.fallbacks, isEmpty);
        expect(view(args).data.saving, isFalse);
      });
    });

    test('there is nothing to delete on a new transaction', () async {
      final args = await setup();
      await form(args).remove();
      expect(env.confirm.asked, isEmpty);
    });

    test('cancel goes back to the list', () async {
      final args = await setup();
      form(args).cancel();
      expect(env.back.fallbacks, ['/transactions']);
    });

    test('the JSON the server receives is plain data', () async {
      final args = await setup();
      await fillExpense(args);
      await form(args).save();
      expect(() => jsonEncode(saved.single['body']), returnsNormally);
    });
  });
}
