import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide AccountInput, Ref;
import 'package:spacefly_mobile/features/editor/account_picker_vm.dart';
import 'package:spacefly_mobile/format/formatter.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  final accounts = EditorLookups.fromJson(editorLookupsJson()).accounts;
  final f = Formatter(languageCode: 'en', currency: 'DOP');

  AccountPicker picker(AccountSide side, AccountSlot? other, {AccountInput? value}) => AccountPicker(value: value, accounts: accounts, side: side, other: other, f: f, t: t);

  test('reads a value as the control sees it', () {
    expect(const AccountInput.id('7').comboValue, '7');
    expect(const AccountInput.name('Nuevo').comboValue, 'Nuevo');
    expect([const AccountInput.id('7'), const AccountInput.name('x')].map((v) => v.isCreated), [false, true]);
    expect(const AccountInput.id('7'), const AccountInput.id('7'));
    expect(const AccountInput.id('7') == const AccountInput.name('7'), isFalse);
    expect(const AccountInput.name('x').toJson(), {'name': 'x'});
    expect(const AccountInput.id('1').toJson(), {'id': '1'});
  });

  test('allows only the combinations that make a transaction', () {
    expect(slotFits(AccountSide.source, null, AccountSlot.ASSET), isTrue);
    expect(slotFits(AccountSide.destination, AccountSlot.REVENUE, AccountSlot.EXPENSE), isFalse, reason: 'income account → expense account is not a thing');
    expect(slotFits(AccountSide.destination, AccountSlot.ASSET, AccountSlot.EXPENSE), isTrue);
    expect(slotFits(AccountSide.source, AccountSlot.EXPENSE, AccountSlot.REVENUE), isFalse);
    expect(slotFits(AccountSide.source, AccountSlot.ASSET, AccountSlot.NEW), isTrue);
  });

  test('lists the kinds that make sense for a source, with balances, and marks incompatible ones', () {
    final options = picker(AccountSide.source, AccountSlot.EXPENSE).options;
    expect(options.map((o) => o.label), ['Banco Popular', 'Cuenta USD', 'Préstamo', 'Empresa SRL'], reason: 'asset, liability, revenue: no expense accounts as a source');
    final byLabel = {for (final o in options) o.label: o};
    expect((byLabel['Banco Popular']!.hint, byLabel['Banco Popular']!.invalid), ('RD\$1,500.00', false));
    expect(byLabel['Empresa SRL']!.invalid, isTrue, reason: 'revenue → expense');
    expect(byLabel['Préstamo']!.hintNegative, isTrue);
    expect(options.first.group, 'Assets');
  });

  test('shows the destination side without balances', () {
    final p = picker(AccountSide.destination, null);
    expect(p.options.map((o) => o.label), ['Banco Popular', 'Cuenta USD', 'Préstamo', 'Supermercado']);
    expect(p.options.first.hint, 'DOP');
    expect(p.createLabel('Colmado'), contains('Colmado'));
    expect(picker(AccountSide.source, null).createLabel('Empresa'), contains('Empresa'));
  });

  test('knows whether a new name can be offered next to the other side', () {
    expect(picker(AccountSide.destination, AccountSlot.ASSET).createInvalid, isFalse);
    expect(picker(AccountSide.destination, AccountSlot.REVENUE).createInvalid, isTrue);
  });

  test('shows the balance of the selected source', () {
    expect(picker(AccountSide.source, null, value: const AccountInput.id('1')).selectedBalance, (text: 'RD\$1,500.00', negative: false));
    expect(picker(AccountSide.source, null, value: const AccountInput.name('Nuevo')).selectedBalance, isNull);
    expect(picker(AccountSide.destination, null, value: const AccountInput.id('1')).selectedBalance, isNull);
  });

  test('turns a selection back into a value', () {
    expect(AccountPicker.select('1'), const AccountInput.id('1'));
    expect(AccountPicker.select('Nuevo', created: true), const AccountInput.name('Nuevo'));
    expect(AccountPicker.select(''), isNull);
  });
}
