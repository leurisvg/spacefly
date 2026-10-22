import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart' hide Ref, AccountInput;
import '../../api/write_api.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';
import '../../shared/amount.dart';
import '../../shared/dates.dart';
import '../../shared/tx_type.dart';
import '../../state/editor_lookups.dart';
import '../../state/filters_store.dart';
import '../../state/meta_store.dart';
import '../../state/preferences.dart';
import '../../storage/stores.dart';
import '../../ui_logic/time.dart';
import 'account_picker_vm.dart';

/// The form's own shape: strings everywhere so every control binds directly.
class TxModel {
  const TxModel({
    this.description = '',
    this.source,
    this.destination,
    this.amount = '',
    this.foreignAmount = '',
    this.foreignCurrency = '',
    this.otherCurrency = false,
    this.date = '',
    this.time = '',
    this.category = '',
    this.budgetId = '',
    this.billId = '',
    this.tags = const [],
    this.notes = '',
  });

  final String description;
  final AccountInput? source;
  final AccountInput? destination;
  final String amount;

  /// Amount in the other currency (received amount of a cross-currency transfer, or "other currency").
  final String foreignAmount;
  final String foreignCurrency;
  final bool otherCurrency;
  final String date;

  /// `HH:mm`, or empty to let the server decide (noon, or the stored time when editing an unchanged day).
  final String time;
  final String category;
  final String budgetId;
  final String billId;
  final List<String> tags;
  final String notes;

  TxModel copyWith({
    String? description,
    Object? source = _keep,
    Object? destination = _keep,
    String? amount,
    String? foreignAmount,
    String? foreignCurrency,
    bool? otherCurrency,
    String? date,
    String? time,
    String? category,
    String? budgetId,
    String? billId,
    List<String>? tags,
    String? notes,
  }) =>
      TxModel(
        description: description ?? this.description,
        source: identical(source, _keep) ? this.source : source as AccountInput?,
        destination: identical(destination, _keep) ? this.destination : destination as AccountInput?,
        amount: amount ?? this.amount,
        foreignAmount: foreignAmount ?? this.foreignAmount,
        foreignCurrency: foreignCurrency ?? this.foreignCurrency,
        otherCurrency: otherCurrency ?? this.otherCurrency,
        date: date ?? this.date,
        time: time ?? this.time,
        category: category ?? this.category,
        budgetId: budgetId ?? this.budgetId,
        billId: billId ?? this.billId,
        tags: tags ?? this.tags,
        notes: notes ?? this.notes,
      );
}

const _keep = Object();

class AfterSave {
  const AfterSave({this.stay = false, this.reset = true});

  /// Stay on the form after saving instead of going back.
  final bool stay;

  /// When staying after a creation: empty the form (today's date, default account) instead of keeping the data.
  final bool reset;

  AfterSave copyWith({bool? stay, bool? reset}) => AfterSave(stay: stay ?? this.stay, reset: reset ?? this.reset);
}

const afterSaveKey = 'spacefly.tx.afterSave';

AfterSave _readAfterSave(KeyValueStore store) {
  try {
    final raw = store.getString(afterSaveKey);
    if (raw == null) return const AfterSave();
    final json = jsonDecode(raw);
    if (json is Map && json['stay'] is bool && json['reset'] is bool) return AfterSave(stay: json['stay'] as bool, reset: json['reset'] as bool);
  } catch (_) {
    // unreadable storage: use the default
  }
  return const AfterSave();
}

/// What `/transactions/new?source=…&destination=…` can pre-fill (account ids or names, plain text).
class TxQueryValues {
  const TxQueryValues({this.source, this.destination, this.date, this.description, this.amount, this.category, this.budget, this.bill});

  factory TxQueryValues.fromMap(Map<String, String> q) =>
      TxQueryValues(source: q['source'], destination: q['destination'], date: q['date'], description: q['description'], amount: q['amount'], category: q['category'], budget: q['budget'], bill: q['bill']);

  final String? source;
  final String? destination;
  final String? date;
  final String? description;
  final String? amount;
  final String? category;
  final String? budget;
  final String? bill;

  @override
  bool operator ==(Object other) =>
      other is TxQueryValues &&
      other.source == source &&
      other.destination == destination &&
      other.date == date &&
      other.description == description &&
      other.amount == amount &&
      other.category == category &&
      other.budget == budget &&
      other.bill == bill;

  @override
  int get hashCode => Object.hash(source, destination, date, description, amount, category, budget, bill);
}

enum TxFormStatus { loading, ready, notEditable, missing, error }

const txFormFallback = '/transactions';

TxModel blankTxModel(DateTime now) => TxModel(date: todayIso(now), time: nowTime(now));

/// Today's date, the default account and whatever the query string asked for. [accountIds] tells an existing account (by id) from a name to
/// create.
TxModel withDefaults(TxModel m, {required Set<String> accountIds, required String? defaultAccountId, required TxQueryValues? query, required DateTime now}) {
  AccountInput? asAccount(String? v) => v == null || v.isEmpty ? null : (accountIds.contains(v) ? AccountInput.id(v) : AccountInput.name(v));
  final q = query;
  return m.copyWith(
    source: asAccount(q?.source) ?? (defaultAccountId != null ? AccountInput.id(defaultAccountId) : null),
    destination: asAccount(q?.destination),
    date: q?.date != null && isIsoDate(q!.date) ? q.date : todayIso(now),
    time: nowTime(now),
    description: q?.description ?? m.description,
    amount: q?.amount != null && isPositiveAmount(q!.amount) ? q.amount : m.amount,
    category: q?.category ?? m.category,
    budgetId: q?.budget ?? m.budgetId,
    billId: q?.bill ?? m.billId,
  );
}

/// The form model of a stored transaction.
TxModel txModelFromPayload(TxEditPayload tx) {
  final hasForeign = tx.type != TxKind.TRANSFER && (tx.foreignAmount ?? '').isNotEmpty;
  return TxModel(
    description: tx.description,
    source: AccountInput.id(tx.source.id),
    destination: AccountInput.id(tx.destination.id),
    amount: trimAmountZeros(tx.amount),
    foreignAmount: trimAmountZeros(tx.foreignAmount ?? ''),
    foreignCurrency: tx.foreignCurrency ?? '',
    otherCurrency: hasForeign,
    date: tx.date,
    time: tx.time ?? '',
    category: tx.category ?? '',
    budgetId: tx.budgetId ?? '',
    billId: tx.billId ?? '',
    tags: tx.tags,
    notes: tx.notes ?? '',
  );
}

/// The write request for a valid model. [foreign] is the already-resolved other-currency amount, if the type needs one.
Map<String, Object?> buildTxRequest(TxModel m, TxKind? type, ({String amount, String currency})? foreign) {
  String? orNull(String s) => s.trim().isEmpty ? null : s.trim();
  return {
    'description': m.description.trim(),
    'date': m.date,
    'time': parseTime(m.time),
    'source': m.source!.toJson(),
    'destination': m.destination!.toJson(),
    'amount': m.amount,
    'foreignAmount': foreign?.amount,
    'foreignCurrency': foreign?.currency,
    'category': orNull(m.category),
    'budgetId': type == TxKind.WITHDRAWAL && m.budgetId.isNotEmpty ? m.budgetId : null,
    'billId': type == TxKind.WITHDRAWAL && m.billId.isNotEmpty ? m.billId : null,
    'tags': m.tags,
    'notes': orNull(m.notes),
  };
}

/// One validation problem of a field: the server's message, or a kind the client words (`forms.errors.<kind>`).
class FieldError {
  const FieldError(this.kind, [this.message]);
  final String kind;
  final String? message;

  bool get fromServer => kind == 'server';
}

/// The text of one validation error: the server's message, else `forms.errors.<kind>`, else the generic one.
String formErrorText(Translations t, FieldError e) {
  if (e.message != null) return e.message!;
  final errors = t.forms.errors;
  return switch (e.kind) {
    'required' => errors.required,
    'positive' => errors.positive,
    'amount' => errors.amount,
    'date' => errors.date,
    'time' => errors.time,
    'min' => errors.min,
    'max' => errors.max,
    'minlength' => errors.minlength,
    'maxlength' => errors.maxlength,
    'pattern' => errors.pattern,
    'email' => errors.email,
    'combination' => errors.combination,
    'foreign' => errors.foreign,
    'range' => errors.range,
    'endDate' => errors.endDate,
    'day' => errors.day,
    'accounts' => errors.accounts,
    'interest' => errors.interest,
    _ => errors.invalid,
  };
}

class TxFormArgs {
  const TxFormArgs({this.id, this.query = const TxQueryValues()});

  /// Route param of `/transactions/:id/edit`.
  final String? id;

  /// Pre-fill from the route's query string (create mode).
  final TxQueryValues query;

  @override
  bool operator ==(Object other) => other is TxFormArgs && other.id == id && other.query == query;

  @override
  int get hashCode => Object.hash(id, query);
}

/// An account of a loaded transaction, kept in case the account lists do not have it (an inactive account).
class KnownAccount {
  const KnownAccount(this.name, this.kind);
  final String name;
  final AccountKind? kind;
}

class TxFormData {
  const TxFormData({
    required this.model,
    this.knownAccounts = const {},
    this.status = TxFormStatus.ready,
    this.blockedReason,
    this.recordTitle,
    this.saving = false,
    this.submitted = false,
    this.serverErrors = const {},
    this.after = const AfterSave(),
    this.descriptionTerm = '',
    this.resetTick = 0,
  });

  final TxModel model;

  /// Name and kind of the two accounts of the transaction being edited, by id.
  final Map<String, KnownAccount> knownAccounts;
  final TxFormStatus status;
  final String? blockedReason;

  /// Description of the transaction being edited, as loaded (not as typed).
  final String? recordTitle;
  final bool saving;

  /// The user tried to save: every client error is shown from now on.
  final bool submitted;

  /// What the server said about each field, keyed like the request.
  final Map<String, List<String>> serverErrors;
  final AfterSave after;

  /// What the suggestions are looked up for (the description once typing paused).
  final String descriptionTerm;

  /// Bumped when the form is emptied after saving, so the screen can refocus the first field.
  final int resetTick;

  TxFormData copyWith({
    TxModel? model,
    Map<String, KnownAccount>? knownAccounts,
    TxFormStatus? status,
    Object? blockedReason = _keep,
    Object? recordTitle = _keep,
    bool? saving,
    bool? submitted,
    Map<String, List<String>>? serverErrors,
    AfterSave? after,
    String? descriptionTerm,
    int? resetTick,
  }) =>
      TxFormData(
        model: model ?? this.model,
        knownAccounts: knownAccounts ?? this.knownAccounts,
        status: status ?? this.status,
        blockedReason: identical(blockedReason, _keep) ? this.blockedReason : blockedReason as String?,
        recordTitle: identical(recordTitle, _keep) ? this.recordTitle : recordTitle as String?,
        saving: saving ?? this.saving,
        submitted: submitted ?? this.submitted,
        serverErrors: serverErrors ?? this.serverErrors,
        after: after ?? this.after,
        descriptionTerm: descriptionTerm ?? this.descriptionTerm,
        resetTick: resetTick ?? this.resetTick,
      );
}

/// How long typing pauses before earlier descriptions are looked up; tests shorten it.
final suggestionDebounceProvider = Provider<Duration>((ref) => const Duration(milliseconds: 200));

/// Create or edit one transaction. Port of `transactionFormViewModel` in libs/client/src/features/editor/transaction-form.vm.ts: the
/// state and the actions are here ([TxFormNotifier]); what follows from the accounts is in [TxFormView].
final txFormProvider = NotifierProvider.autoDispose.family<TxFormNotifier, TxFormData, TxFormArgs>(TxFormNotifier.new);

class TxFormNotifier extends AutoDisposeFamilyNotifier<TxFormData, TxFormArgs> {
  Timer? _debounce;
  bool _initialized = false;

  DateTime get _now => ref.read(clockProvider)();

  @override
  TxFormData build(TxFormArgs arg) {
    ref.onDispose(() => _debounce?.cancel());
    final after = _readAfterSave(ref.read(keyValueStoreProvider));
    if (arg.id != null) {
      Future.microtask(() => _load(arg.id!));
      return TxFormData(model: blankTxModel(_now), status: TxFormStatus.loading, after: after);
    }
    // Create mode: fill in the defaults once the account list is known.
    ref.listen(editorLookupsProvider, (_, next) => _initCreate(next.valueOrNull), fireImmediately: true);
    return TxFormData(model: blankTxModel(_now), after: after);
  }

  /// The derived values of the form as they are now. Built here, not read from [txFormViewProvider]: that one depends on this notifier.
  TxFormView _view() => TxFormView(
        data: state,
        lookups: ref.read(editorLookupsProvider).valueOrNull,
        primary: ref.read(primaryCurrencyProvider),
        f: ref.read(formatterProvider),
        t: t,
        suggestions: const [],
        args: arg,
        now: _now,
      );

  TxModel _defaults(TxModel m, EditorLookups lookups, {bool useQuery = true}) => withDefaults(
        m,
        accountIds: {for (final a in lookups.accounts) a.id},
        defaultAccountId: lookups.defaultAccountId,
        query: useQuery ? arg.query : null,
        now: _now,
      );

  void _initCreate(EditorLookups? lookups) {
    if (_initialized || lookups == null) return;
    _initialized = true;
    state = state.copyWith(model: _defaults(state.model, lookups));
  }

  Future<void> _load(String id) async {
    state = state.copyWith(status: TxFormStatus.loading, recordTitle: null);
    try {
      final tx = await ref.read(writeApiProvider).getTransaction(id);
      state = state.copyWith(
        recordTitle: tx.description,
        model: txModelFromPayload(tx),
        knownAccounts: {tx.source.id: KnownAccount(tx.source.name, tx.source.kind), tx.destination.id: KnownAccount(tx.destination.name, tx.destination.kind)},
        status: TxFormStatus.ready,
        submitted: false,
        serverErrors: const {},
      );
    } on WriteError catch (e) {
      if (e.kind == WriteErrorKind.notEditable) {
        state = state.copyWith(blockedReason: e.reason, status: TxFormStatus.notEditable);
      } else {
        state = state.copyWith(status: e.kind == WriteErrorKind.notFound ? TxFormStatus.missing : TxFormStatus.error);
      }
    } catch (_) {
      state = state.copyWith(status: TxFormStatus.error);
    }
  }

  void reload() {
    final id = arg.id;
    if (id != null) _load(id);
  }

  // ── Editing ─────────────────────────────────────────────────────────────────

  /// Changes the model; what the server said about [field] no longer applies to the new value.
  void _edit(TxModel Function(TxModel m) change, {List<String> fields = const []}) {
    final errors = {...state.serverErrors};
    for (final f in fields) {
      errors.remove(f);
    }
    state = state.copyWith(model: change(state.model), serverErrors: errors);
  }

  void setDescription(String v) => _edit((m) => m.copyWith(description: v), fields: ['description']);
  void setSource(AccountInput? v) => _edit((m) => m.copyWith(source: v), fields: ['source']);
  void setDestination(AccountInput? v) => _edit((m) => m.copyWith(destination: v), fields: ['destination']);
  void setAmount(String v) => _edit((m) => m.copyWith(amount: v), fields: ['amount']);
  void setForeignAmount(String v) => _edit((m) => m.copyWith(foreignAmount: v), fields: ['foreignAmount']);
  void setForeignCurrency(String v) => _edit((m) => m.copyWith(foreignCurrency: v), fields: ['foreignCurrency']);
  void setOtherCurrency(bool v) => _edit((m) => m.copyWith(otherCurrency: v));
  void setDate(String v) => _edit((m) => m.copyWith(date: v), fields: ['date']);
  void setTime(String v) => _edit((m) => m.copyWith(time: v), fields: ['time']);
  void setCategory(String v) => _edit((m) => m.copyWith(category: v), fields: ['category']);
  void setBudgetId(String v) => _edit((m) => m.copyWith(budgetId: v), fields: ['budgetId']);
  void setBillId(String v) => _edit((m) => m.copyWith(billId: v), fields: ['billId']);
  void setTags(List<String> v) => _edit((m) => m.copyWith(tags: v), fields: ['tags']);
  void setNotes(String v) => _edit((m) => m.copyWith(notes: v), fields: ['notes']);

  void swap() => _edit((m) => m.copyWith(source: m.destination, destination: m.source), fields: ['source', 'destination']);

  void setAfter(AfterSave Function(AfterSave a) change) {
    final next = change(state.after);
    state = state.copyWith(after: next);
    ref.read(keyValueStoreProvider).setString(afterSaveKey, jsonEncode({'stay': next.stay, 'reset': next.reset}));
  }

  /// The description field changed: look up earlier descriptions once typing pauses.
  void onDescriptionTyped(String text) {
    final term = text.trim();
    _debounce?.cancel();
    if (term.isEmpty) {
      state = state.copyWith(descriptionTerm: '');
      return;
    }
    _debounce = Timer(ref.read(suggestionDebounceProvider), () => state = state.copyWith(descriptionTerm: term));
  }

  void cancel() => ref.read(backNavigationProvider).back(txFormFallback);

  // ── Saving ──────────────────────────────────────────────────────────────────

  /// Sends the transaction and then does what "after saving" asks for. A refused save leaves the server's messages on the fields.
  Future<void> save() async {
    if (state.saving) return;
    state = state.copyWith(submitted: true);
    final view = _view();
    if (view.hasClientErrors) return;
    await _persist(view);
  }

  Future<void> _persist(TxFormView view) async {
    final t = view.t;
    final toast = ref.read(toastProvider);
    state = state.copyWith(saving: true);
    try {
      final id = arg.id;
      final request = view.request();
      if (id != null) {
        await ref.read(writeApiProvider).updateTransaction(id, request);
      } else {
        await ref.read(writeApiProvider).createTransaction(request);
      }
      toast.success(id != null ? t.editor.tx.updated : t.editor.tx.created);
      await _afterSave();
    } on WriteError catch (e) {
      switch (e.kind) {
        case WriteErrorKind.validation:
          state = state.copyWith(serverErrors: e.fields);
        case WriteErrorKind.notEditable:
          state = state.copyWith(blockedReason: e.reason, status: TxFormStatus.notEditable);
        case WriteErrorKind.network:
          toast.error(t.editor.networkError);
        default:
          toast.error(t.errors.generic);
      }
    } catch (_) {
      toast.error(t.errors.generic);
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  Future<void> _afterSave() async {
    final after = state.after;
    final id = arg.id;
    if (!after.stay) {
      ref.read(backNavigationProvider).back(txFormFallback);
    } else if (id != null) {
      // Rules may have changed fields: show what Firefly actually stored.
      await _load(id);
    } else if (after.reset) {
      final lookups = ref.read(editorLookupsProvider).valueOrNull;
      final blank = blankTxModel(_now);
      state = state.copyWith(
        model: lookups == null ? blank : _defaults(blank, lookups, useQuery: false),
        submitted: false,
        serverErrors: const {},
        resetTick: state.resetTick + 1,
      );
    } else {
      state = state.copyWith(submitted: false, serverErrors: const {});
    }
  }

  Future<void> remove() async {
    final id = arg.id;
    if (id == null || state.saving) return;
    final t = _view().t;
    final name = state.model.description.isEmpty ? t.nav.explorer : state.model.description;
    final ok = await ref.read(confirmProvider).confirm(Confirmation(title: t.editor.tx.deleteTitle, message: t.editor.tx.deleteMessage(name: name), confirmLabel: t.forms.delete, destructive: true));
    if (!ok) return;
    state = state.copyWith(saving: true);
    try {
      await ref.read(writeApiProvider).deleteTransaction(id);
      ref.read(toastProvider).success(t.editor.tx.deleted);
      ref.read(backNavigationProvider).back(txFormFallback);
    } catch (_) {
      ref.read(toastProvider).error(t.errors.generic);
    } finally {
      state = state.copyWith(saving: false);
    }
  }
}

class Option {
  const Option(this.value, this.label);
  final String value;
  final String label;
}

/// Earlier descriptions that match what is being typed (Firefly's own autocomplete).
final descriptionSuggestionsProvider = FutureProvider.autoDispose.family<List<String>, TxFormArgs>((ref, args) async {
  final term = ref.watch(txFormProvider(args).select((d) => d.descriptionTerm));
  if (term.isEmpty) return const [];
  final response = await ref.watch(dioProvider).get<List<dynamic>>('/api/lookups/descriptions', queryParameters: {'q': term});
  return [for (final d in response.data ?? const []) d.toString()];
});

/// What follows from the form's state and the account lists: the type, the currencies, the errors and the option lists.
class TxFormView {
  TxFormView({required this.data, required this.lookups, required this.primary, required this.f, required this.t, required this.suggestions, required this.args, required this.now});

  final TxFormData data;
  final EditorLookups? lookups;
  final String primary;
  final Formatter f;
  final Translations t;
  final List<String> suggestions;
  final TxFormArgs args;
  final DateTime now;

  TxModel get model => data.model;
  bool get isEdit => args.id != null;
  List<EditorAccount> get accounts => lookups?.accounts ?? const [];

  EditorAccount? _account(AccountInput? v) => v?.id == null ? null : accounts.where((a) => a.id == v!.id).firstOrNull;

  AccountSlot? _slotOf(AccountInput? v) {
    if (v == null) return null;
    if (v.isCreated) return AccountSlot.NEW;
    return slotOfKind(_account(v)?.kind ?? data.knownAccounts[v.id]?.kind);
  }

  AccountSlot? get sourceSlot => _slotOf(model.source);
  AccountSlot? get destinationSlot => _slotOf(model.destination);
  EditorAccount? get sourceAccount => _account(model.source);
  EditorAccount? get destinationAccount => _account(model.destination);

  /// Never picked: the user does not choose it, it follows from the two accounts.
  TxKind? get type => inferTransactionType(sourceSlot, destinationSlot);

  /// The amount is in the currency of the account on the amount side; the source's while the type is unknown.
  String get amountCurrency {
    final ty = type;
    final account = ty != null && amountSide(ty) == AmountSide.destination ? destinationAccount : sourceAccount;
    return account?.currency ?? sourceAccount?.currency ?? primary;
  }

  String get receivedCurrency => destinationAccount?.currency ?? '';

  bool get crossCurrency => type == TxKind.TRANSFER && sourceAccount != null && destinationAccount != null && sourceAccount!.currency != destinationAccount!.currency;
  bool get showOtherCurrency => type == TxKind.WITHDRAWAL || type == TxKind.DEPOSIT;
  bool get showBudgetBill => type == TxKind.WITHDRAWAL;
  bool get foreignRequired => crossCurrency || (showOtherCurrency && model.otherCurrency);

  // ── Option lists ────────────────────────────────────────────────────────────
  List<Option> get categoryOptions => [for (final c in lookups?.categories ?? const []) Option(c.name, c.name)];
  List<Option> get budgetOptions => [for (final b in lookups?.budgets ?? const []) Option(b.id, b.name)];
  List<Option> get billOptions => [for (final b in lookups?.bills ?? const <EditorBill>[]) if (b.active || b.id == model.billId) Option(b.id, b.name)];
  List<String> get tagNames => [for (final x in lookups?.tags ?? const []) x.name];
  List<Option> get otherCurrencyOptions => [for (final c in lookups?.currencies ?? const <CurrencyInfo>[]) if (c.code != amountCurrency) Option(c.code, '${c.code} · ${c.name}')];

  AccountPicker picker(AccountSide side) => AccountPicker(
        value: side == AccountSide.source ? model.source : model.destination,
        accounts: accounts,
        side: side,
        other: side == AccountSide.source ? destinationSlot : sourceSlot,
        f: f,
        t: t,
      );

  /// The text a tap field shows for an account value.
  String accountLabel(AccountInput? v) {
    if (v == null) return '';
    if (v.isCreated) return v.name!;
    return _account(v)?.name ?? data.knownAccounts[v.id]?.name ?? '';
  }

  String? get fireflyUrlPath => args.id == null ? null : '/transactions/show/${args.id}';

  // ── Validation ──────────────────────────────────────────────────────────────
  Map<String, List<FieldError>> get clientErrors {
    final m = model;
    final out = <String, List<FieldError>>{};
    void add(String field, String kind) => (out[field] ??= []).add(FieldError(kind));

    if (m.description.trim().isEmpty) add('description', 'required');
    if (m.description.length > 1000) add('description', 'maxlength');
    if (m.notes.length > 65000) add('notes', 'maxlength');
    if (m.source == null) add('source', 'required');
    if (m.destination == null) {
      add('destination', 'required');
    } else if (sourceSlot != null && type == null) {
      add('destination', 'combination');
    }
    if (m.amount.trim().isEmpty) {
      add('amount', 'required');
    } else if (!isPositiveAmount(m.amount)) {
      add('amount', 'positive');
    }
    if (foreignRequired) {
      if (m.foreignAmount.trim().isEmpty) {
        add('foreignAmount', 'foreign');
      } else if (!isPositiveAmount(m.foreignAmount)) {
        add('foreignAmount', 'positive');
      }
      if (!crossCurrency && m.foreignCurrency.isEmpty) add('foreignCurrency', 'required');
    }
    if (!isIsoDate(m.date)) add('date', 'date');
    if (m.time.trim().isNotEmpty && parseTime(m.time) == null) add('time', 'time');
    return out;
  }

  bool get hasClientErrors => clientErrors.isNotEmpty;

  static const _fields = ['description', 'source', 'destination', 'amount', 'foreignAmount', 'foreignCurrency', 'date', 'time', 'category', 'budgetId', 'billId', 'tags', 'notes'];

  /// The messages to show under a field: the server's right away, the client's once a save was tried.
  List<String> errorsFor(String field) => [
        for (final e in clientErrors[field] ?? const <FieldError>[])
          if (data.submitted) formErrorText(t, e),
        ...?data.serverErrors[field],
      ];

  /// Server messages about fields this form has no control for.
  List<String> get generalErrors => [for (final e in data.serverErrors.entries) if (!_fields.contains(e.key)) ...e.value];

  /// The first field, in form order, that has something to show.
  String? get firstErrorField => _fields.where((f) => errorsFor(f).isNotEmpty).firstOrNull;

  /// The write request for the current model.
  Map<String, Object?> request() {
    final m = model;
    final foreign = crossCurrency
        ? (amount: m.foreignAmount, currency: receivedCurrency)
        : (showOtherCurrency && m.otherCurrency ? (amount: m.foreignAmount, currency: m.foreignCurrency) : null);
    return buildTxRequest(m, type, foreign);
  }

  /// Earlier descriptions to offer under the description field.
  List<String> get descriptionOptions => data.descriptionTerm.isEmpty ? const [] : suggestions;
}

final txFormViewProvider = Provider.autoDispose.family<TxFormView, TxFormArgs>((ref, args) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return TxFormView(
    data: ref.watch(txFormProvider(args)),
    lookups: ref.watch(editorLookupsProvider).valueOrNull,
    primary: ref.watch(primaryCurrencyProvider),
    f: ref.watch(formatterProvider),
    t: t,
    suggestions: ref.watch(descriptionSuggestionsProvider(args)).valueOrNull ?? const [],
    args: args,
    now: ref.read(clockProvider)(),
  );
});
