import '../../i18n/strings.g.dart';
import '../../shared/amount.dart';
import '../../shared/dates.dart';
import 'entity_form_vm.dart';

/// Port of the entity form view-models in libs/client/src/features/editor/{category,tag,budget,bill,account,piggy}-form.vm.ts.

const _maxName = 255;
const _maxNotes = 65000;

final _plainAmount = RegExp(r'^\d+(\.\d+)?$');
final _signedAmount = RegExp(r'^-?\d+(\.\d+)?$');

/// The first problem found, in the order the checks are added: `required`, `positive`…
class _Check {
  _Check(this.model);
  final EntityModel model;
  final Map<String, String> errors = {};

  void add(String field, String? kind) {
    if (kind != null) errors.putIfAbsent(field, () => kind);
  }

  void name(String field) {
    add(field, model.text(field).trim().isEmpty ? 'required' : null);
    maxLength(field, _maxName);
  }

  void maxLength(String field, int max) => add(field, model.text(field).length > max ? 'maxlength' : null);

  void date(String field, {bool required = false}) {
    final v = model.text(field);
    add(field, v.isEmpty ? (required ? 'date' : null) : (isIsoDate(v) ? null : 'date'));
  }
}

const autoBudgetTypes = ['reset', 'rollover', 'adjusted'];
const autoBudgetPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'half-year', 'yearly'];
const repeatFreqs = ['weekly', 'monthly', 'quarterly', 'half-year', 'yearly'];
const accountWriteTypes = ['asset', 'liability', 'expense', 'revenue'];
const accountRoles = ['defaultAsset', 'sharedAsset', 'savingAsset', 'ccAsset', 'cashWalletAsset'];
const liabilityTypes = ['loan', 'debt', 'mortgage'];
const interestPeriods = ['daily', 'monthly', 'yearly'];

String autoTypeLabel(Translations t, String x) => switch (x) {
      'reset' => t.editor.entity.budget.autoTypes.reset,
      'rollover' => t.editor.entity.budget.autoTypes.rollover,
      _ => t.editor.entity.budget.autoTypes.adjusted,
    };

String periodLabel(Translations t, String x) => switch (x) {
      'daily' => t.editor.periods.daily,
      'weekly' => t.editor.periods.weekly,
      'monthly' => t.editor.periods.monthly,
      'quarterly' => t.editor.periods.quarterly,
      'half-year' => t.editor.periods.halfYear,
      _ => t.editor.periods.yearly,
    };

String freqLabel(Translations t, String x) => switch (x) {
      'weekly' => t.bills.freq.weekly,
      'monthly' => t.bills.freq.monthly,
      'quarterly' => t.bills.freq.quarterly,
      'half-year' => t.bills.freq.halfYear,
      _ => t.bills.freq.yearly,
    };

String accountTypeLabel(Translations t, String x) => switch (x) {
      'asset' => t.editor.entity.account.types.asset,
      'liability' => t.editor.entity.account.types.liability,
      'expense' => t.editor.entity.account.types.expense,
      _ => t.editor.entity.account.types.revenue,
    };

String roleLabel(Translations t, String x) => switch (x) {
      'defaultAsset' => t.accounts.roles.defaultAsset,
      'sharedAsset' => t.accounts.roles.sharedAsset,
      'savingAsset' => t.accounts.roles.savingAsset,
      'ccAsset' => t.accounts.roles.ccAsset,
      _ => t.accounts.roles.cashWalletAsset,
    };

String liabilityTypeLabel(Translations t, String x) => switch (x) {
      'loan' => t.editor.entity.account.liabilityTypes.loan,
      'debt' => t.editor.entity.account.liabilityTypes.debt,
      _ => t.editor.entity.account.liabilityTypes.mortgage,
    };

String interestPeriodLabel(Translations t, String x) => switch (x) {
      'daily' => t.editor.entity.account.interestPeriods.daily,
      'monthly' => t.editor.entity.account.interestPeriods.monthly,
      _ => t.editor.entity.account.interestPeriods.yearly,
    };

EntitySpec entitySpec(EntityKind kind) => switch (kind) {
      EntityKind.category => const CategorySpec(),
      EntityKind.tag => const TagSpec(),
      EntityKind.budget => const BudgetSpec(),
      EntityKind.bill => const BillSpec(),
      EntityKind.account => const AccountSpec(),
      EntityKind.piggy => const PiggySpec(),
    };

String? _orNull(String s) => s.trim().isEmpty ? null : s.trim();

/// Create or edit a category (name and notes).
class CategorySpec extends EntitySpec {
  const CategorySpec();

  @override
  EntityKind get kind => EntityKind.category;

  @override
  String get path => 'categories';

  @override
  EntityModel blank(EntityContext ctx) => {'name': '', 'notes': ''};

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) => {'name': payload['name'] as String, 'notes': (payload['notes'] as String?) ?? ''};

  @override
  Map<String, Object?> toRequest(EntityModel m) => {'name': m.text('name').trim(), 'notes': _orNull(m.text('notes'))};

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('name')
      ..maxLength('notes', _maxNotes);
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('name');
}

/// Create or edit a tag (name, optional date and description).
class TagSpec extends EntitySpec {
  const TagSpec();

  @override
  EntityKind get kind => EntityKind.tag;

  @override
  String get path => 'tags';

  @override
  EntityModel blank(EntityContext ctx) => {'tag': '', 'date': '', 'description': ''};

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) => {'tag': payload['tag'] as String, 'date': (payload['date'] as String?) ?? '', 'description': (payload['description'] as String?) ?? ''};

  @override
  Map<String, Object?> toRequest(EntityModel m) => {'tag': m.text('tag').trim(), 'date': m.text('date').isEmpty ? null : m.text('date'), 'description': _orNull(m.text('description'))};

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('tag')
      ..date('date')
      ..maxLength('description', _maxNotes);
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('tag');
}

/// Create or edit a budget: name, active, notes and the optional automatic budget (type, amount, period, currency).
class BudgetSpec extends EntitySpec {
  const BudgetSpec();

  @override
  EntityKind get kind => EntityKind.budget;

  @override
  String get path => 'budgets';

  @override
  EntityModel blank(EntityContext ctx) => {'name': '', 'active': true, 'notes': '', 'auto': false, 'autoType': 'reset', 'autoAmount': '', 'autoPeriod': 'monthly', 'autoCurrency': ctx.primaryCurrency};

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) {
    final auto = payload['autoBudget'] as Map?;
    return {
      'name': payload['name'] as String,
      'active': payload['active'] as bool,
      'notes': (payload['notes'] as String?) ?? '',
      'auto': auto != null,
      'autoType': (auto?['type'] as String?) ?? 'reset',
      'autoAmount': (auto?['amount'] as String?) ?? '',
      'autoPeriod': (auto?['period'] as String?) ?? 'monthly',
      'autoCurrency': (auto?['currency'] as String?) ?? ctx.primaryCurrency,
    };
  }

  @override
  Map<String, Object?> toRequest(EntityModel m) => {
        'name': m.text('name').trim(),
        'active': m.flag('active'),
        'notes': _orNull(m.text('notes')),
        'autoBudget': m.flag('auto') ? {'type': m.text('autoType'), 'amount': m.text('autoAmount'), 'period': m.text('autoPeriod'), 'currency': m.text('autoCurrency')} : null,
      };

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('name')
      ..maxLength('notes', _maxNotes);
    if (m.flag('auto')) c.add('autoAmount', m.text('autoAmount').trim().isEmpty ? 'required' : (isPositiveAmount(m.text('autoAmount')) ? null : 'positive'));
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('name');
}

/// Create or edit a subscription (bill): amounts, first date, frequency, optional end, group and notes.
class BillSpec extends EntitySpec {
  const BillSpec();

  @override
  EntityKind get kind => EntityKind.bill;

  @override
  String get path => 'bills';

  @override
  EntityModel blank(EntityContext ctx) => {
        'name': '',
        'fixed': true,
        'amountMin': '',
        'amountMax': '',
        'currency': ctx.primaryCurrency,
        'date': todayIso(),
        'repeatFreq': 'monthly',
        'skip': 0,
        'endDate': '',
        'active': true,
        'group': '',
        'notes': '',
      };

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) => {
        'name': payload['name'] as String,
        'fixed': double.parse(payload['amountMin'] as String) == double.parse(payload['amountMax'] as String),
        'amountMin': payload['amountMin'] as String,
        'amountMax': payload['amountMax'] as String,
        'currency': payload['currency'] as String,
        'date': payload['date'] as String,
        'repeatFreq': payload['repeatFreq'] as String,
        'skip': (payload['skip'] as num).toInt(),
        'endDate': (payload['endDate'] as String?) ?? '',
        'active': payload['active'] as bool,
        'group': (payload['group'] as String?) ?? '',
        'notes': (payload['notes'] as String?) ?? '',
      };

  @override
  Map<String, Object?> toRequest(EntityModel m) => {
        'name': m.text('name').trim(),
        'amountMin': m.text('amountMin'),
        'amountMax': m.flag('fixed') ? m.text('amountMin') : m.text('amountMax'),
        'currency': m.text('currency'),
        'date': m.text('date'),
        'repeatFreq': m.text('repeatFreq'),
        'skip': m.number('skip'),
        'endDate': m.text('endDate').isEmpty ? null : m.text('endDate'),
        'active': m.flag('active'),
        'group': _orNull(m.text('group')),
        'notes': _orNull(m.text('notes')),
      };

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('name')
      ..maxLength('group', _maxName)
      ..maxLength('notes', _maxNotes);
    final min = m.text('amountMin'), max = m.text('amountMax');
    c.add('amountMin', min.trim().isEmpty ? 'required' : (isPositiveAmount(min) ? null : 'positive'));
    if (!m.flag('fixed')) {
      c.add('amountMax', max.trim().isEmpty ? 'required' : (!isPositiveAmount(max) ? 'positive' : (isPositiveAmount(min) && double.parse(max) < double.parse(min) ? 'range' : null)));
    }
    c.add('date', isIsoDate(m.text('date')) ? null : 'date');
    final end = m.text('endDate');
    if (end.isNotEmpty) c.add('endDate', !isIsoDate(end) ? 'date' : (isIsoDate(m.text('date')) && end.compareTo(m.text('date')) <= 0 ? 'endDate' : null));
    c.add('skip', m.number('skip') < 0 ? 'min' : (m.number('skip') > 31 ? 'max' : null));
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('name');
}

/// A card's payment day as a date this month (Firefly stores a date and only uses its day).
String paymentDate(int day, [DateTime? now]) {
  final month = todayIso(now).substring(0, 7);
  final clamped = (day == 0 ? 1 : day).clamp(1, daysInMonth('$month-01'));
  return '$month-${clamped.toString().padLeft(2, '0')}';
}

/// Create or edit an account of any kind. The kind is chosen when creating and then fixed; the fields shown follow it (role and
/// opening balance for assets, interest and debt for liabilities…). Deleting asks to type the account's name and says how many
/// transactions go with it.
class AccountSpec extends EntitySpec {
  const AccountSpec();

  @override
  EntityKind get kind => EntityKind.account;

  @override
  String get path => 'accounts';

  @override
  bool get deleteNeedsName => true;

  @override
  EntityModel blank(EntityContext ctx) => {
        'type': accountWriteTypes.contains(ctx.accountType) ? ctx.accountType : 'asset',
        'name': '',
        'active': true,
        'iban': '',
        'notes': '',
        'currency': ctx.primaryCurrency,
        'includeNetWorth': true,
        'role': 'defaultAsset',
        'cardType': 'monthlyFull',
        'paymentDay': 1,
        'openingBalance': '',
        'openingBalanceDate': '',
        'liabilityType': 'loan',
        'liabilityDirection': 'debit',
        'interest': '0',
        'interestPeriod': 'monthly',
        'transactionCount': 0,
      };

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) => {
        'type': payload['type'] as String,
        'name': payload['name'] as String,
        'active': payload['active'] as bool,
        'iban': (payload['iban'] as String?) ?? '',
        'notes': (payload['notes'] as String?) ?? '',
        'currency': (payload['currency'] as String?) ?? ctx.primaryCurrency,
        'includeNetWorth': payload['includeNetWorth'] as bool,
        'role': (payload['role'] as String?) ?? 'defaultAsset',
        'cardType': (payload['creditCardType'] as String?) ?? 'monthlyFull',
        'paymentDay': payload['monthlyPaymentDate'] != null ? int.parse((payload['monthlyPaymentDate'] as String).substring(8, 10)) : 1,
        'openingBalance': (payload['openingBalance'] as String?) ?? '',
        'openingBalanceDate': (payload['openingBalanceDate'] as String?) ?? '',
        'liabilityType': (payload['liabilityType'] as String?) ?? 'loan',
        'liabilityDirection': (payload['liabilityDirection'] as String?) ?? 'debit',
        'interest': (payload['interest'] as String?) ?? '0',
        'interestPeriod': (payload['interestPeriod'] as String?) ?? 'monthly',
        'transactionCount': (payload['transactionCount'] as num).toInt(),
      };

  @override
  Map<String, Object?> toRequest(EntityModel m) {
    final type = m.text('type');
    final owned = type == 'asset' || type == 'liability';
    final card = type == 'asset' && m.text('role') == 'ccAsset';
    final hasBalance = owned && m.text('openingBalance').trim().isNotEmpty;
    final liability = type == 'liability';
    return {
      'type': type,
      'name': m.text('name').trim(),
      'active': m.flag('active'),
      'iban': _orNull(m.text('iban')),
      'notes': _orNull(m.text('notes')),
      'currency': owned ? m.text('currency') : null,
      'includeNetWorth': m.flag('includeNetWorth'),
      'role': type == 'asset' ? m.text('role') : null,
      'creditCardType': card ? m.text('cardType') : null,
      'monthlyPaymentDate': card ? paymentDate(m.number('paymentDay')) : null,
      'openingBalance': hasBalance ? m.text('openingBalance').trim() : null,
      'openingBalanceDate': hasBalance ? m.text('openingBalanceDate') : null,
      'liabilityType': liability ? m.text('liabilityType') : null,
      'liabilityDirection': liability ? m.text('liabilityDirection') : null,
      'interest': liability ? m.text('interest').trim() : null,
      'interestPeriod': liability ? m.text('interestPeriod') : null,
    };
  }

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('name')
      ..maxLength('iban', 64)
      ..maxLength('notes', _maxNotes);
    final day = m.number('paymentDay');
    if (m.text('role') == 'ccAsset' && m.text('type') == 'asset') c.add('paymentDay', day >= 1 && day <= 31 ? null : 'day');
    if (m.text('type') == 'liability') c.add('interest', _plainAmount.hasMatch(m.text('interest').trim()) ? null : 'interest');
    final balance = m.text('openingBalance');
    c.add('openingBalance', balance.trim().isEmpty || _signedAmount.hasMatch(balance) ? null : 'amount');
    final balanceDate = m.text('openingBalanceDate');
    c.add('openingBalanceDate', balanceDate.isEmpty ? (balance.trim().isNotEmpty ? 'required' : null) : (isIsoDate(balanceDate) ? null : 'date'));
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('name');

  @override
  String? deleteWarning(Translations t, EntityModel m) => m.number('transactionCount') > 0 ? t.editor.entity.account.deleteWarning(count: m.number('transactionCount')) : null;
}

int cents(String amount) => (double.parse(amount) * 100).round();

/// What was typed to add to or remove from a goal's account, as a positive amount; `null` when it is not one.
String? parseAdjust(String raw) {
  final parsed = parseAmount(raw) ?? raw;
  return isPositiveAmount(parsed) ? parsed : null;
}

/// Create or edit a goal (piggy bank): name, currency, target, dates and the accounts it saves from, each with its amount. "Add /
/// remove" moves the saved amount of one account up or down; saving always sends the complete list, because Firefly replaces the
/// goal's accounts with it.
class PiggySpec extends EntitySpec {
  const PiggySpec();

  @override
  EntityKind get kind => EntityKind.piggy;

  @override
  String get path => 'piggy-banks';

  @override
  EntityModel blank(EntityContext ctx) => {'name': '', 'currency': ctx.primaryCurrency, 'targetAmount': '', 'startDate': '', 'targetDate': '', 'group': '', 'notes': '', 'accounts': <Map<String, String>>[]};

  @override
  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx) => {
        'name': payload['name'] as String,
        'currency': payload['currency'] as String,
        'targetAmount': (payload['targetAmount'] as String?) ?? '',
        'startDate': (payload['startDate'] as String?) ?? '',
        'targetDate': (payload['targetDate'] as String?) ?? '',
        'group': (payload['group'] as String?) ?? '',
        'notes': (payload['notes'] as String?) ?? '',
        'accounts': [
          for (final a in payload['accounts'] as List) {'accountId': (a as Map)['accountId'] as String, 'currentAmount': a['currentAmount'] as String, 'adjust': ''},
        ],
      };

  /// The complete list of accounts, always: Firefly drops the ones that aren't sent.
  @override
  Map<String, Object?> toRequest(EntityModel m) => {
        'name': m.text('name').trim(),
        'currency': m.text('currency'),
        'targetAmount': _orNull(m.text('targetAmount')),
        'startDate': m.text('startDate').isEmpty ? null : m.text('startDate'),
        'targetDate': m.text('targetDate').isEmpty ? null : m.text('targetDate'),
        'group': _orNull(m.text('group')),
        'notes': _orNull(m.text('notes')),
        'accounts': [for (final a in m.rows('accounts')) {'accountId': a['accountId'], 'currentAmount': a['currentAmount']!.trim()}],
      };

  @override
  Map<String, String> validate(EntityModel m, {required bool isEdit}) {
    final c = _Check(m)
      ..name('name')
      ..maxLength('group', _maxName)
      ..maxLength('notes', _maxNotes);
    final target = m.text('targetAmount');
    c.add('targetAmount', target.trim().isEmpty || isPositiveAmount(target) ? null : 'positive');
    c.date('startDate');
    final targetDate = m.text('targetDate'), startDate = m.text('startDate');
    c.add('targetDate', targetDate.isEmpty ? null : (!isIsoDate(targetDate) ? 'date' : (startDate.isNotEmpty && targetDate.compareTo(startDate) < 0 ? 'endDate' : null)));
    final rows = m.rows('accounts');
    c.add('accounts', rows.isEmpty ? 'accounts' : null);
    for (final (i, r) in rows.indexed) {
      c.add('accounts.$i', _plainAmount.hasMatch(r['currentAmount']!.trim()) ? null : 'amount');
    }
    return c.errors;
  }

  @override
  String displayName(EntityModel m) => m.text('name');
}
