import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/editor/entity_form_vm.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart' show todayIso;
import '../ui/common.dart';
import '../ui/form_widgets.dart';
import '../ui_logic/time.dart';

/// The fields of each kind in the order they are shown: the first one with a problem is scrolled into view when saving fails.
const _fieldOrder = {
  EntityKind.category: ['name', 'notes'],
  EntityKind.tag: ['tag', 'date', 'description'],
  EntityKind.budget: ['name', 'notes', 'autoAmount'],
  EntityKind.bill: ['name', 'amountMin', 'amountMax', 'date', 'skip', 'endDate', 'group', 'notes'],
  EntityKind.account: ['name', 'iban', 'paymentDay', 'openingBalance', 'openingBalanceDate', 'interest', 'notes'],
  EntityKind.piggy: ['name', 'targetAmount', 'startDate', 'targetDate', 'accounts', 'group', 'notes'],
};

/// Create or edit a category, tag, budget, subscription, account or goal (`/edit/:kind/:id?`). The generic part is `entityFormProvider`;
/// the fields shown follow the kind.
class EntityFormScreen extends ConsumerStatefulWidget {
  const EntityFormScreen({super.key, required this.kind, this.id, this.accountType});

  final EntityKind kind;
  final String? id;

  /// The kind a new account starts as (`?type=expense`).
  final String? accountType;

  @override
  ConsumerState<EntityFormScreen> createState() => _EntityFormScreenState();
}

class _EntityFormScreenState extends ConsumerState<EntityFormScreen> {
  final _keys = <String, GlobalKey>{};

  GlobalKey _key(String field) => _keys.putIfAbsent(field, GlobalKey.new);

  EntityFormArgs get _args => (kind: widget.kind, id: widget.id, accountType: widget.accountType);

  EntityFormNotifier get _form => ref.read(entityFormProvider(_args).notifier);

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    await _form.save();
    if (!mounted) return;
    final first = ref.read(entityFormViewProvider(_args)).firstErrorField(_fieldOrder[widget.kind]!);
    final ctx = first == null ? null : _key(first).currentContext;
    if (ctx != null && ctx.mounted) await Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 250), alignment: 0.1);
  }

  Future<void> _pick(String title, List<({String value, String label})> options, String selected, void Function(String) set, {String? none}) async {
    final picked = await showOptionSheet(context, title: title, options: [for (final o in options) PickerOption(o.value, o.label)], selected: selected, none: none);
    if (picked != null) set(picked);
  }

  Future<void> _pickDate(String title, String current, void Function(String) set) async {
    final today = todayIso(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: isoToLocalDate(current, today),
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 30, 12, 31),
      helpText: title,
    );
    if (picked != null) set(localDateToIso(picked));
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final view = ref.watch(entityFormViewProvider(_args));
    final data = view.data;
    final m = view.model;
    final scheme = Theme.of(context).colorScheme;
    String? err(String field) => view.errorsFor(field).isEmpty ? null : view.errorsFor(field).join(' ');
    const gap = SizedBox(height: 16);

    Widget text(String field, String label, {bool required = false, int lines = 1, TextInputType? keyboard, List<TextInputFormatter>? formatters, String? hint, IconData? icon, bool enabled = true, TextCapitalization caps = TextCapitalization.sentences, String? suffix}) {
      return KeyedSubtree(
        key: _key(field),
        child: TextFormField(
          key: ValueKey('$field-${data.loadTick}'),
          initialValue: m.text(field),
          enabled: enabled,
          minLines: lines,
          maxLines: lines == 1 ? 1 : lines + 3,
          keyboardType: keyboard,
          inputFormatters: formatters,
          textCapitalization: caps,
          decoration: InputDecoration(labelText: required ? '$label *' : label, hintText: hint, suffixText: suffix, errorText: err(field), alignLabelWithHint: lines > 1, prefixIcon: icon == null ? null : Icon(icon, size: 20)),
          onChanged: (v) => _form.set(field, v),
        ),
      );
    }

    final decimal = TextInputType.numberWithOptions(decimal: true);
    final signedDecimal = TextInputType.numberWithOptions(decimal: true, signed: true);

    Widget amount(String field, String label, {bool required = false, bool signed = false, String? hint, String? currency}) =>
        text(field, label, required: required, keyboard: signed ? signedDecimal : decimal, formatters: [FilteringTextInputFormatter.allow(RegExp(signed ? r'[-0-9.,]' : r'[0-9.,]'))], hint: hint, suffix: currency, caps: TextCapitalization.none);

    Widget integer(String field, String label, {String? hint, bool required = false}) {
      return KeyedSubtree(
        key: _key(field),
        child: TextFormField(
          key: ValueKey('$field-${data.loadTick}'),
          initialValue: '${m.number(field)}',
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(labelText: required ? '$label *' : label, helperText: hint, helperMaxLines: 2, errorText: err(field)),
          onChanged: (v) => _form.set(field, int.tryParse(v) ?? 0),
        ),
      );
    }

    Widget toggle(String field, String label, {String? subtitle, bool enabled = true}) =>
        SwitchListTile(key: Key('switch-$field'), contentPadding: EdgeInsets.zero, title: Text(label), subtitle: subtitle == null ? null : Text(subtitle), value: m.flag(field), onChanged: enabled ? (v) => _form.set(field, v) : null);

    Widget option(String field, String label, List<({String value, String label})> options, {bool enabled = true, IconData? icon, String? none, String? hint, bool required = false}) {
      final current = options.where((o) => o.value == m.text(field)).firstOrNull;
      return KeyedSubtree(
        key: _key(field),
        child: TapField(
          key: Key('option-$field'),
          label: label,
          required: required,
          value: current?.label ?? '',
          placeholder: none,
          icon: icon,
          errorText: err(field),
          helperText: hint,
          onTap: enabled ? () => _pick(label, options, m.text(field), (v) => _form.set(field, v), none: none) : () {},
          trailing: enabled ? null : const SizedBox.shrink(),
        ),
      );
    }

    Widget date(String field, String label, {bool optional = false, String? hint, bool required = false}) {
      final value = m.text(field);
      return KeyedSubtree(
        key: _key(field),
        child: TapField(
          key: Key('date-$field'),
          label: label,
          required: required,
          value: value,
          placeholder: optional ? '—' : null,
          icon: Icons.event_outlined,
          errorText: err(field),
          helperText: hint,
          onTap: () => _pickDate(label, value, (v) => _form.set(field, v)),
          trailing: optional && value.isNotEmpty ? IconButton(key: Key('clear-$field'), tooltip: t.editor.clear, icon: const Icon(Icons.close, size: 20), onPressed: () => _form.set(field, '')) : const SizedBox.shrink(),
        ),
      );
    }

    final currency = [for (final o in view.currencyOptions) o];

    List<Widget> category() => [text('name', t.editor.fields.name, required: true), gap, text('notes', t.editor.fields.notes, lines: 3)];

    List<Widget> tag() => [
          text('tag', t.editor.fields.name, required: true),
          gap,
          date('date', t.editor.entity.tag.date, optional: true, hint: t.editor.entity.tag.dateHint),
          gap,
          text('description', t.editor.fields.description, lines: 3),
        ];

    List<Widget> budget() => [
          text('name', t.editor.fields.name, required: true),
          toggle('active', t.editor.fields.active),
          text('notes', t.editor.fields.notes, lines: 3),
          gap,
          toggle('auto', t.editor.entity.budget.auto, subtitle: t.editor.entity.budget.autoHint),
          if (m.flag('auto')) ...[
            option('autoType', t.editor.entity.budget.autoType, view.autoTypeOptions),
            gap,
            amount('autoAmount', t.editor.entity.budget.autoAmount, required: true, currency: m.text('autoCurrency')),
            gap,
            option('autoPeriod', t.editor.entity.budget.autoPeriod, view.periodOptions),
            gap,
            option('autoCurrency', t.editor.fields.currency, currency),
          ],
        ];

    List<Widget> bill() => [
          text('name', t.editor.fields.name, required: true),
          gap,
          toggle('fixed', t.editor.entity.bill.fixed),
          amount('amountMin', m.flag('fixed') ? t.editor.entity.bill.amount : t.editor.entity.bill.amountMin, required: true, currency: m.text('currency')),
          if (!m.flag('fixed')) ...[gap, amount('amountMax', t.editor.entity.bill.amountMax, required: true, currency: m.text('currency'))],
          gap,
          option('currency', t.editor.fields.currency, currency),
          gap,
          date('date', t.editor.entity.bill.date, required: true),
          gap,
          option('repeatFreq', t.editor.entity.bill.freq, view.freqOptions),
          gap,
          integer('skip', t.editor.entity.bill.skip, hint: t.editor.entity.bill.skipHint),
          gap,
          date('endDate', t.editor.entity.bill.endDate, optional: true, hint: t.editor.entity.bill.endDateHint),
          gap,
          text('group', t.editor.fields.group),
          toggle('active', t.editor.fields.active),
          text('notes', t.editor.fields.notes, lines: 3),
        ];

    List<Widget> account() => [
          option('type', t.editor.entity.account.type, view.accountTypeOptions, enabled: !view.isEdit, hint: view.isEdit ? t.editor.entity.account.typeLocked : null),
          gap,
          text('name', t.editor.fields.name, required: true),
          toggle('active', t.editor.fields.active),
          if (view.isOwned) ...[
            option('currency', t.editor.fields.currency, currency),
            gap,
          ],
          if (view.isAsset) ...[
            option('role', t.editor.entity.account.role, view.roleOptions, required: true),
            gap,
            if (view.isCard) ...[
              option('cardType', t.editor.entity.account.cardType, [(value: 'monthlyFull', label: t.editor.entity.account.cardTypes.monthlyFull)]),
              gap,
              integer('paymentDay', t.editor.entity.account.paymentDay, required: true),
              gap,
            ],
          ],
          if (view.isLiability) ...[
            option('liabilityType', t.editor.entity.account.liabilityType, view.liabilityOptions),
            gap,
            option('liabilityDirection', t.editor.entity.account.direction, view.directionOptions),
            gap,
            amount('interest', t.editor.entity.account.interest, required: true),
            gap,
            option('interestPeriod', t.editor.entity.account.interestPeriod, view.interestPeriodOptions),
            gap,
          ],
          if (view.isOwned) ...[
            amount('openingBalance', view.isLiability ? t.editor.entity.account.owed : t.editor.entity.account.openingBalance, signed: true, currency: m.text('currency')),
            gap,
            date('openingBalanceDate', view.isLiability ? t.editor.entity.account.startDate : t.editor.entity.account.openingBalanceDate, optional: true),
            toggle('includeNetWorth', t.editor.entity.account.includeNetWorth),
            gap,
          ],
          text('iban', t.editor.entity.account.iban, caps: TextCapitalization.characters),
          gap,
          text('notes', t.editor.fields.notes, lines: 3),
        ];

    List<Widget> piggy() {
      final rows = m.rows('accounts');
      final options = view.piggyAccountOptions;
      return [
        text('name', t.editor.fields.name, required: true),
        gap,
        option('currency', t.editor.fields.currency, currency, enabled: rows.isEmpty),
        gap,
        amount('targetAmount', t.editor.entity.piggy.target, currency: m.text('currency')),
        gap,
        date('startDate', t.editor.entity.piggy.startDate, optional: true),
        gap,
        date('targetDate', t.editor.entity.piggy.targetDate, optional: true),
        gap,
        KeyedSubtree(
          key: _key('accounts'),
          child: SectionCard(
            title: t.editor.entity.piggy.accounts,
            subtitle: t.editor.entity.piggy.adjustHint,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (i, row) in rows.indexed)
                  Padding(
                    key: ValueKey('piggy-row-${row['accountId']}'),
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(child: Text(view.piggyAccountName(row['accountId']), style: const TextStyle(fontWeight: FontWeight.w600))),
                            IconButton(key: Key('piggy-remove-$i'), tooltip: t.editor.entity.piggy.remove(name: view.piggyAccountName(row['accountId'])), icon: const Icon(Icons.close, size: 20), onPressed: () => _form.removeAccount(i)),
                          ],
                        ),
                        TextFormField(
                          key: ValueKey('piggy-amount-$i-${row['currentAmount']}-${data.loadTick}'),
                          initialValue: row['currentAmount'],
                          keyboardType: decimal,
                          decoration: InputDecoration(labelText: t.editor.entity.piggy.saved, suffixText: m.text('currency'), errorText: err('accounts.$i')),
                          onChanged: (v) => _form.setAccountField(i, 'currentAmount', v),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                key: ValueKey('piggy-adjust-$i-${row['adjust']!.isEmpty}-${data.loadTick}'),
                                initialValue: row['adjust'],
                                keyboardType: decimal,
                                decoration: InputDecoration(labelText: t.editor.entity.piggy.adjustLabel, suffixText: m.text('currency'), isDense: true),
                                onChanged: (v) => _form.setAccountField(i, 'adjust', v),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(key: Key('piggy-add-$i'), tooltip: t.editor.entity.piggy.add, icon: const Icon(Icons.add), onPressed: canAdjust(m, i) ? () => _form.adjust(i, 1) : null),
                            IconButton.filledTonal(key: Key('piggy-subtract-$i'), tooltip: t.editor.entity.piggy.subtract, icon: const Icon(Icons.remove), onPressed: canAdjust(m, i) ? () => _form.adjust(i, -1) : null),
                          ],
                        ),
                      ],
                    ),
                  ),
                if (options.isNotEmpty)
                  OutlinedButton.icon(
                    key: const Key('piggy-pick-account'),
                    onPressed: () => _pick(t.editor.entity.piggy.accounts, options, '', _form.addAccount),
                    icon: const Icon(Icons.add, size: 18),
                    label: Text(t.editor.entity.piggy.addAccount),
                  ),
                if (err('accounts') != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(err('accounts')!, style: TextStyle(color: scheme.error, fontSize: 12))),
                if (rows.isEmpty && err('accounts') == null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(t.editor.entity.piggy.none, style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12))),
              ],
            ),
          ),
        ),
        gap,
        text('group', t.editor.fields.group),
        gap,
        text('notes', t.editor.fields.notes, lines: 3),
      ];
    }

    final fields = switch (widget.kind) {
      EntityKind.category => category(),
      EntityKind.tag => tag(),
      EntityKind.budget => budget(),
      EntityKind.bill => bill(),
      EntityKind.account => account(),
      EntityKind.piggy => piggy(),
    };

    return Scaffold(
      appBar: AppBar(title: Text(view.title), actions: [if (data.status == EntityFormStatus.ready) SavePill(onPressed: _save, busy: data.saving)]),
      body: switch (data.status) {
        EntityFormStatus.loading => const Center(child: CircularProgressIndicator()),
        EntityFormStatus.missing => _Message(text: t.editor.missing, onBack: _form.cancel),
        EntityFormStatus.error => _Message(text: t.editor.loadError, onRetry: _form.reload, onBack: _form.cancel),
        EntityFormStatus.ready => ListView(
            key: Key('entity-form-${widget.kind.name}'),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              ...fields,
              if (view.generalErrors.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text(view.generalErrors.join(' '), style: TextStyle(color: scheme.error))),
              if (view.isEdit) ...[
                const SizedBox(height: 24),
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
