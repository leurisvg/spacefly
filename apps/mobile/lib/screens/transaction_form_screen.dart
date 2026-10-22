import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/editor/account_picker_vm.dart';
import '../features/editor/transaction_form_vm.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart';
import '../shared/tx_type.dart' show txKindName;
import '../ui/account_sheet.dart';
import '../ui/common.dart';
import '../ui/form_widgets.dart';
import '../ui/labels.dart';
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
  final _tags = TextEditingController();
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
    for (final c in [_description, _amount, _foreignAmount, _category, _tags, _notes]) {
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
    if (_parseTags(_tags.text).join('\u0000') != m.tags.join('\u0000')) put(_tags, m.tags.join(', '));
    put(_notes, m.notes);
  }

  static List<String> _parseTags(String text) => [for (final x in text.split(',')) if (x.trim().isNotEmpty) x.trim()];

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
        TxFormStatus.notEditable => _Message(text: data.blockedReason == 'type' ? t.editor.tx.notEditable.type : t.editor.tx.notEditable.splits, title: t.editor.tx.notEditable.title, onBack: _form.cancel),
        TxFormStatus.missing => _Message(text: t.editor.tx.missing, onBack: _form.cancel),
        TxFormStatus.error => _Message(text: t.editor.tx.loadError, onRetry: _form.reload, onBack: _form.cancel),
        TxFormStatus.ready => ListView(
            key: const Key('tx-form'),
            controller: _scroll,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (view.type != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Chip(key: const Key('type-chip'), avatar: Icon(Icons.bolt, size: 16, color: scheme.primary), label: Text(txTypeLabel(t, txKindName(view.type!)))),
                  ),
                ),
              KeyedSubtree(
                key: _key('description'),
                child: SuggestField(
                  controller: _description,
                  focusNode: _descriptionFocus,
                  label: t.editor.tx.descriptionLabel,
                  icon: Icons.receipt_long_outlined,
                  required: true,
                  errorText: err('description'),
                  options: [for (final d in view.descriptionOptions) Suggestion(d, d)],
                  onChanged: (v) {
                    _form.setDescription(v);
                    _form.onDescriptionTyped(v);
                  },
                ),
              ),
              const SizedBox(height: 16),
              KeyedSubtree(
                key: _key('amount'),
                child: TextField(
                  key: const Key('amount'),
                  controller: _amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: '${t.editor.tx.amount} *', prefixText: '${view.amountCurrency}  ', errorText: err('amount')),
                  onChanged: _form.setAmount,
                ),
              ),
              if (view.crossCurrency) ...[
                const SizedBox(height: 16),
                KeyedSubtree(
                  key: _key('foreignAmount'),
                  child: TextField(
                    key: const Key('received-amount'),
                    controller: _foreignAmount,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: '${t.editor.tx.received(currency: view.receivedCurrency)} *', prefixText: '${view.receivedCurrency}  ', errorText: err('foreignAmount')),
                    onChanged: _form.setForeignAmount,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: KeyedSubtree(key: _key('date'), child: TapField(key: const Key('date'), label: t.editor.tx.date, required: true, icon: Icons.event_outlined, value: m.date, errorText: err('date'), onTap: () => _pickDate(view), trailing: const SizedBox.shrink())),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: KeyedSubtree(
                      key: _key('time'),
                      child: TapField(
                        key: const Key('time'),
                        label: t.forms.hour,
                        icon: Icons.schedule,
                        value: m.time,
                        placeholder: '—',
                        errorText: err('time'),
                        onTap: () => _pickTime(view),
                        trailing: m.time.isEmpty ? const SizedBox.shrink() : IconButton(tooltip: t.forms.clear, icon: const Icon(Icons.close, size: 18), onPressed: () => _form.setTime('')),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Stack(
                alignment: Alignment.centerRight,
                children: [
                  Column(
                    children: [
                      KeyedSubtree(
                        key: _key('source'),
                        child: TapField(
                          key: const Key('source'),
                          label: t.editor.tx.from,
                          required: true,
                          icon: Icons.north_east,
                          value: view.accountLabel(m.source),
                          placeholder: t.editor.tx.accountPlaceholder,
                          errorText: err('source'),
                          onTap: () => _pickAccount(AccountSide.source, view),
                          trailing: const SizedBox(width: 48),
                        ),
                      ),
                      if (view.picker(AccountSide.source).selectedBalance case final b?)
                        Align(alignment: Alignment.centerRight, child: Padding(padding: const EdgeInsets.only(top: 2, right: 56), child: Text(b.text, style: numStyle(context, size: 11, color: b.negative ? scheme.error : scheme.onSurfaceVariant)))),
                      const SizedBox(height: 16),
                      KeyedSubtree(
                        key: _key('destination'),
                        child: TapField(
                          key: const Key('destination'),
                          label: t.editor.tx.to,
                          required: true,
                          icon: Icons.south_west,
                          value: view.accountLabel(m.destination),
                          placeholder: t.editor.tx.accountPlaceholder,
                          errorText: err('destination'),
                          onTap: () => _pickAccount(AccountSide.destination, view),
                          trailing: const SizedBox(width: 48),
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
              const SizedBox(height: 16),
              KeyedSubtree(
                key: _key('category'),
                child: SuggestField(
                  controller: _category,
                  focusNode: _categoryFocus,
                  label: t.common.category,
                  hint: t.editor.tx.categoryPlaceholder,
                  icon: Icons.label_outline,
                  errorText: err('category'),
                  options: [for (final o in view.categoryOptions) Suggestion(o.value, o.label)],
                  onChanged: _form.setCategory,
                ),
              ),
              if (view.showBudgetBill) ...[
                const SizedBox(height: 16),
                TapField(
                  key: const Key('budget'),
                  label: t.common.budget,
                  icon: Icons.savings_outlined,
                  value: view.budgetOptions.where((o) => o.value == m.budgetId).firstOrNull?.label ?? t.common.noBudget,
                  errorText: err('budgetId'),
                  onTap: () => _pick(t.common.budget, view.budgetOptions, m.budgetId, _form.setBudgetId, none: t.common.noBudget),
                ),
                const SizedBox(height: 16),
                TapField(
                  key: const Key('bill'),
                  label: t.editor.tx.bill,
                  icon: Icons.repeat,
                  value: view.billOptions.where((o) => o.value == m.billId).firstOrNull?.label ?? t.editor.tx.noBill,
                  errorText: err('billId'),
                  onTap: () => _pick(t.editor.tx.bill, view.billOptions, m.billId, _form.setBillId, none: t.editor.tx.noBill),
                ),
              ],
              if (view.showOtherCurrency) ...[
                SwitchListTile(
                  key: const Key('other-currency'),
                  contentPadding: EdgeInsets.zero,
                  secondary: const Icon(Icons.currency_exchange),
                  title: Text(t.editor.tx.otherCurrency),
                  value: m.otherCurrency,
                  onChanged: _form.setOtherCurrency,
                ),
                if (m.otherCurrency) ...[
                  TapField(
                    key: const Key('foreign-currency'),
                    label: t.editor.tx.foreignCurrency,
                    required: true,
                    value: m.foreignCurrency,
                    errorText: err('foreignCurrency'),
                    onTap: () => _pick(t.editor.tx.foreignCurrency, view.otherCurrencyOptions, m.foreignCurrency, _form.setForeignCurrency),
                  ),
                  const SizedBox(height: 16),
                  KeyedSubtree(
                    key: _key('foreignAmount'),
                    child: TextField(
                      key: const Key('foreign-amount'),
                      controller: _foreignAmount,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: '${t.editor.tx.foreignAmount} *', prefixText: m.foreignCurrency.isEmpty ? null : '${m.foreignCurrency}  ', errorText: err('foreignAmount')),
                      onChanged: _form.setForeignAmount,
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 16),
              TextField(
                key: const Key('tags'),
                controller: _tags,
                autocorrect: false,
                decoration: InputDecoration(labelText: t.common.tag, hintText: 'a, b', prefixIcon: const Icon(Icons.sell_outlined, size: 20), errorText: err('tags')),
                onChanged: (v) => _form.setTags(_parseTags(v)),
              ),
              const SizedBox(height: 16),
              TextField(
                key: const Key('notes'),
                controller: _notes,
                minLines: 3,
                maxLines: 6,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(labelText: t.editor.tx.notes, alignLabelWithHint: true, errorText: err('notes')),
                onChanged: _form.setNotes,
              ),
              if (view.generalErrors.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text(view.generalErrors.join(' '), style: TextStyle(color: scheme.error))),
              const SizedBox(height: 8),
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

class _Message extends StatelessWidget {
  const _Message({required this.text, required this.onBack, this.title, this.onRetry});

  final String text;
  final String? title;
  final VoidCallback onBack;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(title: title, child: Text(text)),
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
