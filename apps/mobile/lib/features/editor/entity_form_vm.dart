import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/write_api.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';
import '../../state/editor_lookups.dart';
import '../../state/meta_store.dart';
import '../../state/preferences.dart';
import 'entity_specs.dart';
import 'transaction_form_vm.dart' show FieldError, formErrorText;

/// What can be created and edited besides transactions. Port of `EntityKind` in libs/client/src/state/entity-editor.service.ts.
enum EntityKind { category, tag, budget, bill, account, piggy }

/// The form's values by field name: text as `String`, switches as `bool`, numbers as `int`, a goal's accounts as a list of rows.
typedef EntityModel = Map<String, Object?>;

extension EntityModelValues on EntityModel {
  String text(String key) => (this[key] as String?) ?? '';
  bool flag(String key) => (this[key] as bool?) ?? false;
  int number(String key) => (this[key] as int?) ?? 0;
  List<Map<String, String>> rows(String key) => [for (final r in (this[key] as List?) ?? const []) (r as Map).cast<String, String>()];
}

/// What a spec needs to know about the app to fill a blank form.
class EntityContext {
  const EntityContext({required this.primaryCurrency, this.accountType = 'asset'});
  final String primaryCurrency;

  /// The kind a new account starts as.
  final String accountType;
}

/// What an entity form is made of; the generic part is [EntityFormNotifier]. Port of `EntityFormSpec` in
/// libs/client/src/features/editor/entity-form.vm.ts. Each kind's spec is in entity_specs.dart.
abstract class EntitySpec {
  const EntitySpec();

  EntityKind get kind;

  /// Path under `/api` (`categories`).
  String get path;

  EntityModel blank(EntityContext ctx);

  EntityModel toModel(Map<String, dynamic> payload, EntityContext ctx);

  /// The write request for a valid model.
  Map<String, Object?> toRequest(EntityModel m);

  /// The first problem of each invalid field: its name → the kind of error (`forms.errors.<kind>`).
  Map<String, String> validate(EntityModel m, {required bool isEdit});

  String displayName(EntityModel m);

  /// Extra text for the delete confirmation (an account's transaction count…); `null` for none.
  String? deleteWarning(Translations t, EntityModel m) => null;

  /// Whether the user must type the name to delete (an account).
  bool get deleteNeedsName => false;
}

/// The texts of one kind of entity (`editor.entity.<kind>.*`).
class EntityTexts {
  const EntityTexts({required this.create, required this.edit, required this.created, required this.updated, required this.deleted, required this.deleteTitle, required this.deleteMessage});
  final String create;
  final String edit;
  final String created;
  final String updated;
  final String deleted;
  final String deleteTitle;
  final String Function(String name) deleteMessage;
}

EntityTexts entityTexts(Translations t, EntityKind kind) {
  final e = t.editor.entity;
  return switch (kind) {
    EntityKind.category => EntityTexts(create: e.category.kNew, edit: e.category.edit, created: e.category.created, updated: e.category.updated, deleted: e.category.deleted, deleteTitle: e.category.deleteTitle, deleteMessage: (n) => e.category.deleteMessage(name: n)),
    EntityKind.tag => EntityTexts(create: e.tag.kNew, edit: e.tag.edit, created: e.tag.created, updated: e.tag.updated, deleted: e.tag.deleted, deleteTitle: e.tag.deleteTitle, deleteMessage: (n) => e.tag.deleteMessage(name: n)),
    EntityKind.budget => EntityTexts(create: e.budget.kNew, edit: e.budget.edit, created: e.budget.created, updated: e.budget.updated, deleted: e.budget.deleted, deleteTitle: e.budget.deleteTitle, deleteMessage: (n) => e.budget.deleteMessage(name: n)),
    EntityKind.bill => EntityTexts(create: e.bill.kNew, edit: e.bill.edit, created: e.bill.created, updated: e.bill.updated, deleted: e.bill.deleted, deleteTitle: e.bill.deleteTitle, deleteMessage: (n) => e.bill.deleteMessage(name: n)),
    EntityKind.account => EntityTexts(create: e.account.kNew, edit: e.account.edit, created: e.account.created, updated: e.account.updated, deleted: e.account.deleted, deleteTitle: e.account.deleteTitle, deleteMessage: (n) => e.account.deleteMessage(name: n)),
    EntityKind.piggy => EntityTexts(create: e.piggy.kNew, edit: e.piggy.edit, created: e.piggy.created, updated: e.piggy.updated, deleted: e.piggy.deleted, deleteTitle: e.piggy.deleteTitle, deleteMessage: (n) => e.piggy.deleteMessage(name: n)),
  };
}

enum EntityFormStatus { loading, ready, missing, error }

/// Where the form goes when it has nowhere to pop back to.
const entityFormFallback = '/more';

/// Which record: the kind, its id (`null` creates), and the kind a new account starts as.
typedef EntityFormArgs = ({EntityKind kind, String? id, String? accountType});

class EntityFormData {
  const EntityFormData({required this.status, required this.model, this.saving = false, this.submitted = false, this.serverErrors = const {}, this.loadTick = 0});

  final EntityFormStatus status;
  final EntityModel model;
  final bool saving;

  /// True once "Save" was pressed: from then on the client's errors show.
  final bool submitted;

  /// What the server refused, by field.
  final Map<String, List<String>> serverErrors;

  /// Counts the times the model was replaced as a whole (a record loaded), so the text fields start over from it.
  final int loadTick;

  EntityFormData copyWith({EntityFormStatus? status, EntityModel? model, bool? saving, bool? submitted, Map<String, List<String>>? serverErrors, int? loadTick}) => EntityFormData(
        status: status ?? this.status,
        model: model ?? this.model,
        saving: saving ?? this.saving,
        submitted: submitted ?? this.submitted,
        serverErrors: serverErrors ?? this.serverErrors,
        loadTick: loadTick ?? this.loadTick,
      );
}

final entityFormProvider = NotifierProvider.autoDispose.family<EntityFormNotifier, EntityFormData, EntityFormArgs>(EntityFormNotifier.new);

/// What every entity form does: load the record to edit, save (create or update) with the server's field errors shown on their fields,
/// and delete with a confirmation. Port of `entityFormViewModel`.
class EntityFormNotifier extends AutoDisposeFamilyNotifier<EntityFormData, EntityFormArgs> {
  late final EntitySpec _spec = entitySpec(arg.kind);

  EntityContext get _ctx => EntityContext(primaryCurrency: ref.read(primaryCurrencyProvider), accountType: arg.accountType ?? 'asset');

  @override
  EntityFormData build(EntityFormArgs arg) {
    final id = arg.id;
    if (id == null) return EntityFormData(status: EntityFormStatus.ready, model: _spec.blank(_ctx));
    Future.microtask(() => _load(id));
    return const EntityFormData(status: EntityFormStatus.loading, model: {});
  }

  Future<void> _load(String id) async {
    state = state.copyWith(status: EntityFormStatus.loading);
    try {
      final payload = await ref.read(writeApiProvider).get('${_spec.path}/${Uri.encodeComponent(id)}');
      state = state.copyWith(status: EntityFormStatus.ready, model: _spec.toModel(payload, _ctx), submitted: false, serverErrors: const {}, loadTick: state.loadTick + 1);
    } on WriteError catch (e) {
      state = state.copyWith(status: e.kind == WriteErrorKind.notFound ? EntityFormStatus.missing : EntityFormStatus.error);
    } catch (_) {
      state = state.copyWith(status: EntityFormStatus.error);
    }
  }

  void reload() {
    final id = arg.id;
    if (id != null) _load(id);
  }

  void cancel() => ref.read(backNavigationProvider).back(entityFormFallback);

  /// Sets a field; what the server said about it no longer applies.
  void set(String field, Object? value) => patch({field: value});

  void patch(Map<String, Object?> values) {
    state = state.copyWith(
      model: {...state.model, ...values},
      serverErrors: {for (final e in state.serverErrors.entries) if (!values.containsKey(e.key)) e.key: e.value},
    );
  }

  Future<void> save() async {
    if (state.saving) return;
    state = state.copyWith(submitted: true);
    if (_spec.validate(state.model, isEdit: arg.id != null).isNotEmpty) return;
    final t = ref.read(translationsProvider);
    final toast = ref.read(toastProvider);
    final texts = entityTexts(t, arg.kind);
    state = state.copyWith(saving: true);
    try {
      final id = arg.id;
      final request = _spec.toRequest(state.model);
      if (id != null) {
        await ref.read(writeApiProvider).update('${_spec.path}/${Uri.encodeComponent(id)}', request);
      } else {
        await ref.read(writeApiProvider).create(_spec.path, request);
      }
      toast.success(id != null ? texts.updated : texts.created);
      ref.read(backNavigationProvider).back(entityFormFallback);
    } on WriteError catch (e) {
      if (e.kind == WriteErrorKind.validation) {
        state = state.copyWith(serverErrors: e.fields);
      } else {
        toast.error(e.kind == WriteErrorKind.network ? t.editor.networkError : t.errors.generic);
      }
    } catch (_) {
      toast.error(t.errors.generic);
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  Future<void> remove() async {
    final id = arg.id;
    if (id == null || state.saving) return;
    final t = ref.read(translationsProvider);
    final texts = entityTexts(t, arg.kind);
    final name = _spec.displayName(state.model);
    final warning = _spec.deleteWarning(t, state.model);
    final message = texts.deleteMessage(name);
    final ok = await ref.read(confirmProvider).confirm(
          Confirmation(title: texts.deleteTitle, message: warning == null ? message : '$message $warning', confirmLabel: t.forms.delete, destructive: true, requireText: _spec.deleteNeedsName ? name : null),
        );
    if (!ok) return;
    state = state.copyWith(saving: true);
    try {
      await ref.read(writeApiProvider).remove('${_spec.path}/${Uri.encodeComponent(id)}');
      ref.read(toastProvider).success(texts.deleted);
      ref.read(backNavigationProvider).back(entityFormFallback);
    } catch (_) {
      ref.read(toastProvider).error(t.errors.generic);
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  // ── Goals: the accounts a piggy bank saves from ──────────────────────────────

  /// Adds an account to the goal with nothing set aside yet; the first account decides the goal's currency.
  void addAccount(String accountId) {
    if (accountId.isEmpty) return;
    final account = ref.read(editorLookupsProvider).valueOrNull?.accounts.where((a) => a.id == accountId).firstOrNull;
    final rows = state.model.rows('accounts');
    patch({
      'currency': rows.isEmpty && account != null ? account.currency : state.model.text('currency'),
      'accounts': [...rows, {'accountId': accountId, 'currentAmount': '0', 'adjust': ''}],
    });
  }

  void removeAccount(int index) {
    patch({'accounts': [for (final (i, r) in state.model.rows('accounts').indexed) if (i != index) r]});
  }

  void setAccountField(int index, String field, String value) {
    patch({
      'accounts': [for (final (i, r) in state.model.rows('accounts').indexed) i == index ? {...r, field: value} : r],
    });
  }

  /// Adds to or removes from what one account has set aside (never below zero).
  void adjust(int index, int sign) {
    if (!canAdjust(state.model, index)) return;
    patch({
      'accounts': [
        for (final (i, r) in state.model.rows('accounts').indexed)
          if (i != index)
            r
          else
            {
              ...r,
              'currentAmount': ((cents(r['currentAmount']!) + sign * cents(parseAdjust(r['adjust']!)!)).clamp(0, 1 << 52) / 100).toStringAsFixed(2),
              'adjust': '',
            },
      ],
    });
  }
}

/// The text of the translations in the current language, for code that has no widget context.
final translationsProvider = Provider<Translations>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return t;
});

/// What follows from the form's state and the lookups: the errors by field, and the option lists.
class EntityFormView {
  EntityFormView({required this.args, required this.data, required this.t, required this.currencies, required this.accounts});

  final EntityFormArgs args;
  final EntityFormData data;
  final Translations t;
  final List<CurrencyInfo> currencies;
  final List<EditorAccount> accounts;

  EntitySpec get spec => entitySpec(args.kind);

  EntityModel get model => data.model;

  bool get isEdit => args.id != null;

  EntityTexts get texts => entityTexts(t, args.kind);

  String get title => isEdit ? texts.edit : texts.create;

  /// The client's problem of each field (only once the user pressed Save).
  Map<String, String> get clientErrors => data.submitted ? spec.validate(model, isEdit: isEdit) : const {};

  /// What to say under a field: the server's messages, then the client's.
  List<String> errorsFor(String field) => [
        ...?data.serverErrors[field],
        if (clientErrors[field] != null && !(data.serverErrors[field]?.isNotEmpty ?? false)) formErrorText(t, FieldError(clientErrors[field]!)),
      ];

  /// What the server said about fields this form does not have.
  List<String> get generalErrors => [for (final e in data.serverErrors.entries) if (!model.containsKey(e.key) && !e.key.startsWith('accounts')) ...e.value];

  /// The first field with a problem, in the order the form shows them (for scrolling to it).
  String? firstErrorField(List<String> order) {
    final bad = {...clientErrors.keys, ...data.serverErrors.keys};
    return order.where(bad.contains).firstOrNull;
  }

  List<({String value, String label})> get currencyOptions => [for (final c in currencies) (value: c.code, label: '${c.code} · ${c.name}')];

  // budget
  List<({String value, String label})> get autoTypeOptions => [for (final x in autoBudgetTypes) (value: x, label: autoTypeLabel(t, x))];
  List<({String value, String label})> get periodOptions => [for (final x in autoBudgetPeriods) (value: x, label: periodLabel(t, x))];

  // bill
  List<({String value, String label})> get freqOptions => [for (final x in repeatFreqs) (value: x, label: freqLabel(t, x))];

  // account
  bool get isAsset => model.text('type') == 'asset';
  bool get isLiability => model.text('type') == 'liability';
  bool get isOwned => isAsset || isLiability;
  bool get isCard => isAsset && model.text('role') == 'ccAsset';
  List<({String value, String label})> get accountTypeOptions => [for (final x in accountWriteTypes) (value: x, label: accountTypeLabel(t, x))];
  List<({String value, String label})> get roleOptions => [for (final r in accountRoles) (value: r, label: roleLabel(t, r))];
  List<({String value, String label})> get liabilityOptions => [for (final x in liabilityTypes) (value: x, label: liabilityTypeLabel(t, x))];
  List<({String value, String label})> get directionOptions => [(value: 'debit', label: t.editor.entity.account.directions.debit), (value: 'credit', label: t.editor.entity.account.directions.credit)];
  List<({String value, String label})> get interestPeriodOptions => [for (final x in interestPeriods) (value: x, label: interestPeriodLabel(t, x))];

  // goals
  /// Asset accounts not in the goal yet; once the goal has one, only those in its currency.
  List<({String value, String label})> get piggyAccountOptions {
    final rows = model.rows('accounts');
    final taken = {for (final r in rows) r['accountId']};
    final currency = model.text('currency');
    return [
      for (final a in accounts)
        if (a.kind == AccountKind.ASSET && !taken.contains(a.id) && (rows.isEmpty || a.currency == currency)) (value: a.id, label: '${a.name} · ${a.currency}'),
    ];
  }

  String piggyAccountName(String? id) => accounts.where((a) => a.id == id).firstOrNull?.name ?? id ?? '';

  bool canAdjust(int index) => data.model.rows('accounts').length > index && _canAdjust(data.model, index);
}

final entityFormViewProvider = Provider.autoDispose.family<EntityFormView, EntityFormArgs>((ref, args) {
  final lookups = ref.watch(editorLookupsProvider).valueOrNull;
  return EntityFormView(
    args: args,
    data: ref.watch(entityFormProvider(args)),
    t: ref.watch(translationsProvider),
    currencies: lookups?.currencies ?? ref.watch(currenciesProvider),
    accounts: lookups?.accounts ?? const [],
  );
});

bool _canAdjust(EntityModel m, int index) => parseAdjust(m.rows('accounts')[index]['adjust'] ?? '') != null;

/// Whether the amount typed in a goal's account row can be added or removed.
bool canAdjust(EntityModel m, int index) => index >= 0 && index < m.rows('accounts').length && _canAdjust(m, index);
