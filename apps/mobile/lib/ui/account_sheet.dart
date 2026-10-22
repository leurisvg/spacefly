import 'package:flutter/material.dart';

import '../features/editor/account_picker_vm.dart';
import '../ui_logic/fold.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';

/// The account chooser of one side of a transaction, in a bottom sheet: a search box, the accounts grouped by kind (those that can't be
/// combined with the other side greyed out, a source's balance on the right) and, for a name that doesn't exist, "Create “…”".
/// Returns the chosen value, or `null` when dismissed.
Future<AccountInput?> showAccountSheet(BuildContext context, {required AccountPicker picker, required String title}) => showModalBottomSheet<AccountInput>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _AccountSheet(picker: picker, title: title),
    );

class _AccountSheet extends StatefulWidget {
  const _AccountSheet({required this.picker, required this.title});

  final AccountPicker picker;
  final String title;

  @override
  State<_AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends State<_AccountSheet> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final q = fold(_search.text.trim());
    final all = widget.picker.options;
    final shown = q.isEmpty ? all : all.where((o) => fold(o.label).contains(q)).toList();
    final typed = _search.text.trim();
    final canCreate = typed.isNotEmpty && !all.any((o) => fold(o.label) == q);

    final rows = <Widget>[];
    String? group;
    for (final o in shown) {
      if (o.group != group) {
        group = o.group;
        rows.add(Padding(padding: const EdgeInsets.fromLTRB(20, 12, 20, 4), child: Text(o.group.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6))));
      }
      rows.add(ListTile(
        key: Key('account-${o.value}'),
        enabled: !o.invalid,
        title: Text(o.label),
        subtitle: o.invalid ? Text(t.forms.account.incompatible) : null,
        trailing: Text(o.hint, style: TextStyle(fontFeatures: const [FontFeature.tabularFigures()], color: o.hintNegative ? tokens.moneyExpense : scheme.onSurfaceVariant)),
        onTap: () => Navigator.of(context).pop(AccountInput.id(o.value)),
      ));
    }
    if (canCreate) {
      rows.add(const Divider());
      rows.add(ListTile(
        key: const Key('account-create'),
        enabled: !widget.picker.createInvalid,
        leading: const Icon(Icons.add),
        title: Text(t.forms.createOption(name: typed)),
        subtitle: widget.picker.createInvalid ? Text(t.forms.account.incompatible) : Text(widget.picker.createLabel(typed)),
        onTap: () => Navigator.of(context).pop(AccountInput.name(typed)),
      ));
    }

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Row(children: [Expanded(child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium))]),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  key: const Key('account-search'),
                  controller: _search,
                  autofocus: false,
                  decoration: InputDecoration(hintText: t.editor.tx.accountPlaceholder, prefixIcon: const Icon(Icons.search), isDense: true),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              Flexible(child: ListView(shrinkWrap: true, children: rows)),
            ],
          ),
        ),
      ),
    );
  }
}
