import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show TxKind;
import '../features/editor/account_picker_vm.dart';
import '../features/editor/transaction_form_vm.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart';
import '../state/meta_store.dart';
import '../theme/app_theme.dart';
import '../ui/account_sheet.dart';
import '../ui/common.dart';
import '../ui/form_widgets.dart';
import '../ui/labels.dart';
import '../ui/not_editable_actions.dart';
import '../ui_logic/suggest.dart';
import '../ui_logic/time.dart';

/// Create (`/transactions/new`) or edit (`/transactions/:id/edit`) a transaction. The rules (the type from the two accounts, other
/// currency, validation, saving, "stay after saving") are in the view-model; this screen draws the fields and binds them.
class TransactionFormScreen extends ConsumerStatefulWidget {
  const TransactionFormScreen({super.key, this.id, this.query = const TxQueryValues()});

  final String? id;
  final TxQueryValues query;

  @override
  ConsumerState<TransactionFormScreen> createState() => _TransactionFormScreenState();
}

class _TransactionFormScreenState extends ConsumerState<TransactionFormScreen> {
  late final TxFormArgs _args = TxFormArgs(id: widget.id, query: widget.query);

  final _description = TextEditingController();
  final _amount = TextEditingController();
  final _foreignAmount = TextEditingController();
  final _category = TextEditingController();
  final _notes = TextEditingController();
  final _descriptionFocus = FocusNode();
  final _categoryFocus = FocusNode();
  final _scroll = ScrollController();
  final _keys = <String, GlobalKey>{};

  GlobalKey _key(String field) => _keys.putIfAbsent(field, GlobalKey.new);

  @override
  void initState() {
    super.initState();
    _sync(ref.read(txFormProvider(_args)).model);
  }

  @override
  void dispose() {
    for (final c in [_description, _amount, _foreignAmount, _category, _notes]) {
      c.dispose();
    }
    _descriptionFocus.dispose();
    _categoryFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Puts the model's text into the controllers that differ (a loaded transaction, a reset form), keeping the caret where it is otherwise.
  void _sync(TxModel m) {
    void put(TextEditingController c, String text) {
      if (c.text != text) c.value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
    }

    put(_description, m.description);
    put(_amount, m.amount);
    put(_foreignAmount, m.foreignAmount);
    put(_category, m.category);
    // Tags are typed as "a, b": do not rewrite the text while it is being typed, only when the list differs from what it says.
    put(_notes, m.notes);
  }


  TxFormNotifier get _form => ref.read(txFormProvider(_args).notifier);

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    await _form.save();
    if (!mounted) return;
    final first = ref.read(txFormViewProvider(_args)).firstErrorField;
    final ctx = first == null ? null : _key(first).currentContext;
    if (ctx != null && ctx.mounted) await Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 250), alignment: 0.1);
  }

  Future<void> _pickAccount(AccountSide side, TxFormView view) async {
    final t = context.t;
    final picked = await showAccountSheet(context, picker: view.picker(side), title: side == AccountSide.source ? t.editor.tx.from : t.editor.tx.to);
    if (picked == null) return;
    side == AccountSide.source ? _form.setSource(picked) : _form.setDestination(picked);
  }

  Future<void> _pickDate(TxFormView view) async {
    final fallback = todayIso(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: isoToLocalDate(view.model.date, fallback),
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 5, 12, 31),
      helpText: context.t.editor.tx.date,
    );
    if (picked != null) _form.setDate(localDateToIso(picked));
  }

  Future<void> _pickTime(TxFormView view) async {
    final help = context.t.forms.pickTime;
    final current = parseTime(view.model.time) ?? nowTime();
    final parts = current.split(':').map(int.parse).toList();
    final picked = await showTimePicker(context: context, initialTime: TimeOfDay(hour: parts[0], minute: parts[1]), helpText: help);
    if (picked != null) _form.setTime(timeOfDayToText(picked.hour, picked.minute));
  }

  Future<void> _pick(String title, List<Option> options, String selected, void Function(String) set, {String? none}) async {
    final picked = await showOptionSheet(context, title: title, options: [for (final o in options) PickerOption(o.value, o.label)], selected: selected, none: none);
    if (picked != null) set(picked);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(txFormProvider(_args), (prev, next) {
      _sync(next.model);
      if (prev != null && next.resetTick != prev.resetTick) _descriptionFocus.requestFocus();
    });
    final t = context.t;
    final view = ref.watch(txFormViewProvider(_args));
    final data = view.data;
    final m = view.model;
    final scheme = Theme.of(context).colorScheme;
    String? err(String field) => view.errorsFor(field).isEmpty ? null : view.errorsFor(field).join(' ');

    return Scaffold(
      appBar: AppBar(
        title: Text(view.isEdit ? t.nav.editTransaction : t.nav.newTransaction),
        actions: [if (data.status == TxFormStatus.ready) SavePill(onPressed: _save, busy: data.saving)],
      ),
      body: switch (data.status) {
        TxFormStatus.loading => const Center(child: CircularProgressIndicator()),
        TxFormStatus.notEditable => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionCard(title: t.editor.tx.notEditable.title, child: Text(data.blockedReason == 'type' ? t.editor.tx.notEditable.type : t.editor.tx.notEditable.splits)),
              const SizedBox(height: 16),
              NotEditableActions(
                groupId: widget.id!,
                name: m.description.isEmpty ? t.nav.explorer : m.description,
                reason: data.blockedReason,
                fireflyEditUrl: fireflyUrl(ref.watch(metaProvider).valueOrNull, '/transactions/edit/${widget.id}'),
                onBack: _form.cancel,
              ),
            ],
          ),
        TxFormStatus.missing => _Message(text: t.editor.tx.missing, onBack: _form.cancel),
        TxFormStatus.error => _Message(text: t.editor.tx.loadError, onRetry: _form.reload, onBack: _form.cancel),
        TxFormStatus.ready => ListView(
            key: const Key('tx-form'),
            controller: _scroll,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _TypeBadge(type: view.type, pending: view.typePending, invalid: view.typeInvalid),
                ),
              ),
              KeyedSubtree(
                key: _key('description'),
                child: FormRow(
                  icon: Icons.receipt_long_outlined,
                  child: SuggestField(
                    controller: _description,
                    focusNode: _descriptionFocus,
                    label: t.editor.tx.descriptionLabel,
                    required: true,
                    errorText: err('description'),
                    options: [for (final d in view.descriptionOptions) Suggestion(d, d)],
                    onChanged: (v) {
                      _form.setDescription(v);
                      _form.onDescriptionTyped(v);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FormRow(
                text: view.amountCurrency,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 5,
                      child: KeyedSubtree(
                        key: _key('amount'),
                        child: TextField(
                          key: const Key('amount'),
                          controller: _amount,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 15),
                          decoration: InputDecoration(labelText: '${t.editor.tx.amount} *', hintText: '0.00', errorText: err('amount'), errorMaxLines: 2, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 18)),
                          onChanged: _form.setAmount,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 5,
                      child: KeyedSubtree(key: _key('date'), child: TapField(key: const Key('date'), dense: true, label: t.editor.tx.date, required: true, value: m.date, errorText: err('date'), onTap: () => _pickDate(view))),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 3,
                      // An empty time lets the server decide: a long press clears it (a short one opens the picker).
                      child: KeyedSubtree(key: _key('time'), child: TapField(key: const Key('time'), dense: true, label: t.forms.hour, value: m.time, placeholder: '—', errorText: err('time'), onTap: () => _pickTime(view), onLongPress: () => _form.setTime(''))),
                    ),
                  ],
                ),
              ),
              if (view.crossCurrency) ...[
                const SizedBox(height: 16),
                FormRow(
                  text: view.receivedCurrency,
                  child: KeyedSubtree(
                    key: _key('foreignAmount'),
                    child: TextField(
                      key: const Key('received-amount'),
                      controller: _foreignAmount,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: '${t.editor.tx.received(currency: view.receivedCurrency)} *', errorText: err('foreignAmount')),
                      onChanged: _form.setForeignAmount,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Stack(
                alignment: Alignment.centerRight,
                children: [
                  Column(
                    children: [
                      KeyedSubtree(
                        key: _key('source'),
                        child: FormRow(
                          icon: Icons.logout,
                          child: TapField(
                            key: const Key('source'),
                            label: t.editor.tx.from,
                            required: true,
                            value: view.accountLabel(m.source),
                            placeholder: t.editor.tx.accountPlaceholder,
                            errorText: err('source'),
                            onTap: () => _pickAccount(AccountSide.source, view),
                            trailing: const SizedBox(width: 48),
                          ),
                        ),
                      ),
                      if (view.picker(AccountSide.source).selectedBalance case final b?)
                        Align(alignment: Alignment.centerRight, child: Padding(padding: const EdgeInsets.only(top: 2, right: 56), child: Text(b.text, style: numStyle(context, size: 11, color: b.negative ? scheme.error : scheme.onSurfaceVariant)))),
                      const SizedBox(height: 16),
                      KeyedSubtree(
                        key: _key('destination'),
                        child: FormRow(
                          icon: Icons.login,
                          child: TapField(
                            key: const Key('destination'),
                            label: t.editor.tx.to,
                            required: true,
                            value: view.accountLabel(m.destination),
                            placeholder: t.editor.tx.accountPlaceholder,
                            errorText: err('destination'),
                            onTap: () => _pickAccount(AccountSide.destination, view),
                            trailing: const SizedBox(width: 48),
                          ),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 4, bottom: 4),
                    child: IconButton.filledTonal(key: const Key('swap'), tooltip: t.editor.tx.swap, icon: const Icon(Icons.swap_vert), onPressed: _form.swap),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              FormCard(
                children: [
                  KeyedSubtree(
                    key: _key('category'),
                    child: FormRow(
                      icon: Icons.assignment_outlined,
                      child: SuggestField(
                        controller: _category,
                        focusNode: _categoryFocus,
                        label: t.common.category,
                        hint: t.editor.tx.categoryPlaceholder,
                        errorText: err('category'),
                        options: [for (final o in view.categoryOptions) Suggestion(o.value, o.label)],
                        onChanged: _form.setCategory,
                      ),
                    ),
                  ),
                  if (view.showBudgetBill) ...[
                    FormRow(
                      icon: Icons.savings_outlined,
                      child: TapField(
                        key: const Key('budget'),
                        label: t.common.budget,
                        value: view.budgetOptions.where((o) => o.value == m.budgetId).firstOrNull?.label ?? t.common.noBudget,
                        errorText: err('budgetId'),
                        onTap: () => _pick(t.common.budget, view.budgetOptions, m.budgetId, _form.setBudgetId, none: t.common.noBudget),
                      ),
                    ),
                    FormRow(
                      icon: Icons.repeat,
                      child: TapField(
                        key: const Key('bill'),
                        label: t.editor.tx.bill,
                        value: view.billOptions.where((o) => o.value == m.billId).firstOrNull?.label ?? t.editor.tx.noBill,
                        errorText: err('billId'),
                        onTap: () => _pick(t.editor.tx.bill, view.billOptions, m.billId, _form.setBillId, none: t.editor.tx.noBill),
                      ),
                    ),
                  ],
                  if (view.showOtherCurrency) ...[
                    FormRow(
                      icon: Icons.currency_exchange,
                      child: SwitchListTile(
                        key: const Key('other-currency'),
                        contentPadding: const EdgeInsets.only(left: 4),
                        title: Text(t.editor.tx.otherCurrency),
                        value: m.otherCurrency,
                        onChanged: _form.setOtherCurrency,
                      ),
                    ),
                    if (m.otherCurrency) ...[
                      FormRow(
                        text: m.foreignCurrency,
                        child: TapField(
                          key: const Key('foreign-currency'),
                          label: t.editor.tx.foreignCurrency,
                          required: true,
                          value: m.foreignCurrency,
                          errorText: err('foreignCurrency'),
                          onTap: () => _pick(t.editor.tx.foreignCurrency, view.otherCurrencyOptions, m.foreignCurrency, _form.setForeignCurrency),
                        ),
                      ),
                      FormRow(
                        text: m.foreignCurrency,
                        child: KeyedSubtree(
                          key: _key('foreignAmount'),
                          child: TextField(
                            key: const Key('foreign-amount'),
                            controller: _foreignAmount,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(labelText: '${t.editor.tx.foreignAmount} *', errorText: err('foreignAmount')),
                            onChanged: _form.setForeignAmount,
                          ),
                        ),
                      ),
                    ],
                  ],
                  FormRow(
                    icon: Icons.sell_outlined,
                    child: TagField(key: const Key('tags'), tags: m.tags, suggestions: view.tagNames, label: t.common.tag, errorText: err('tags'), onChanged: _form.setTags),
                  ),
                  FormRow(
                    icon: Icons.notes,
                    child: TextField(
                      key: const Key('notes'),
                      controller: _notes,
                      minLines: 3,
                      maxLines: 6,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(labelText: t.editor.tx.notes, alignLabelWithHint: true, errorText: err('notes')),
                      onChanged: _form.setNotes,
                    ),
                  ),
                ],
              ),
              if (view.generalErrors.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text(view.generalErrors.join(' '), style: TextStyle(color: scheme.error))),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 12, 4, 4),
                child: Row(
                  key: const Key('rules-note'),
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, size: 16, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Expanded(child: Text(t.editor.tx.rules, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant))),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              SwitchListTile(
                key: const Key('stay'),
                contentPadding: EdgeInsets.zero,
                title: Text(view.isEdit ? t.editor.tx.stayEdit : t.editor.tx.stay),
                value: data.after.stay,
                onChanged: (v) => _form.setAfter((a) => a.copyWith(stay: v)),
              ),
              if (!view.isEdit)
                SwitchListTile(
                  key: const Key('reset'),
                  contentPadding: EdgeInsets.zero,
                  title: Text(t.editor.tx.reset),
                  value: data.after.reset,
                  onChanged: data.after.stay ? (v) => _form.setAfter((a) => a.copyWith(reset: v)) : null,
                ),
              if (view.isEdit) ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  key: const Key('delete'),
                  onPressed: data.saving ? null : _form.remove,
                  icon: const Icon(Icons.delete_outline),
                  label: Text(t.forms.delete),
                  style: OutlinedButton.styleFrom(foregroundColor: scheme.error, side: BorderSide(color: scheme.error), minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                ),
              ],
            ],
          ),
      },
    );
  }
}

/// The type of the transaction, deduced from the two accounts: expense, income or transfer; a hint while an account is missing; a warning
/// for a pair that can't be combined. Announced to screen readers. Port of apps/web/src/app/shared/forms/tx-type-badge.ts.
class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type, required this.pending, required this.invalid});

  final TxKind? type;
  final bool pending;
  final bool invalid;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final (label, color) = pending
        ? (t.forms.txType.pending, scheme.onSurfaceVariant)
        : invalid
            ? (t.forms.txType.invalid, tokens.moneyDeficit)
            : switch (type!) {
                TxKind.WITHDRAWAL => (txTypeLabel(t, 'withdrawal'), tokens.moneyExpense),
                TxKind.DEPOSIT => (txTypeLabel(t, 'deposit'), tokens.moneyIncome),
                TxKind.TRANSFER => (txTypeLabel(t, 'transfer'), scheme.primary),
              };
    return Semantics(
      liveRegion: true,
      child: Chip(
        key: const Key('type-chip'),
        visualDensity: VisualDensity.compact,
        side: BorderSide(color: color.withValues(alpha: 0.5)),
        backgroundColor: pending ? null : color.withValues(alpha: 0.1),
        avatar: Icon(invalid ? Icons.warning_amber_rounded : Icons.bolt, size: 16, color: color),
        label: Text(label, style: TextStyle(color: pending ? scheme.onSurfaceVariant : scheme.onSurface)),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text, required this.onBack, this.onRetry});

  final String text;
  final VoidCallback onBack;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(child: Text(text)),
        const SizedBox(height: 16),
        if (onRetry != null) FilledButton(onPressed: onRetry, child: Text(t.editor.retry)),
        if (onRetry != null) const SizedBox(height: 8),
        OutlinedButton(onPressed: onBack, style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)), child: Text(t.editor.back)),
      ],
    );
  }
}

/// `/transactions/new` pre-filled from a query string (`?source=…&amount=…`).
TransactionFormScreen newTransactionScreen(GoRouterState state) => TransactionFormScreen(query: TxQueryValues.fromMap(state.uri.queryParameters));
