import 'package:flutter/material.dart';

import '../i18n/strings.g.dart';
import '../ui_logic/suggest.dart';

/// An outlined field that opens a picker when tapped: dates, times, accounts, budgets. Shows [value], or [placeholder] while empty.
class TapField extends StatelessWidget {
  const TapField({
    super.key,
    required this.label,
    required this.onTap,
    this.onLongPress,
    this.value = '',
    this.placeholder,
    this.icon,
    this.errorText,
    this.required = false,
    this.trailing,
    this.dense = false,
  });

  final String label;
  final String value;
  final String? placeholder;
  final IconData? icon;
  final String? errorText;
  final bool required;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final Widget? trailing;

  /// Narrow boxes (the amount, date and time row): smaller text and side padding, no arrow.
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        isEmpty: value.isEmpty,
        isFocused: false,
        decoration: InputDecoration(
          labelText: required ? '$label *' : label,
          errorText: errorText,
          prefixIcon: icon == null ? null : Icon(icon, size: 20),
          suffixIcon: trailing ?? (dense ? null : const Icon(Icons.arrow_drop_down)),
          contentPadding: dense ? const EdgeInsets.symmetric(horizontal: 10, vertical: 18) : null,
          floatingLabelBehavior: value.isEmpty && placeholder == null ? FloatingLabelBehavior.auto : FloatingLabelBehavior.always,
        ),
        child: Text(value.isEmpty ? (placeholder ?? '') : value, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: dense ? 15 : null, color: value.isEmpty ? scheme.onSurfaceVariant : null)),
      ),
    );
  }
}

/// A text field with the options that match what is typed listed right under it (not in an overlay, so the keyboard never hides them), all of them in a list that scrolls on its own.
/// Picking one fills the field; typing anything else is allowed. Port of the NativeScript `ns-suggest-field`.
class SuggestField extends StatelessWidget {
  const SuggestField({
    super.key,
    required this.controller,
    required this.label,
    required this.options,
    required this.onChanged,
    this.icon,
    this.errorText,
    this.required = false,
    this.hint,
    this.focusNode,
    this.textInputAction,
  });

  final TextEditingController controller;
  final String label;
  final List<Suggestion> options;
  final void Function(String text) onChanged;
  final IconData? icon;
  final String? errorText;
  final bool required;
  final String? hint;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Listenable.merge([controller, if (focusNode != null) focusNode!]),
        builder: (context, _) {
          final focused = focusNode?.hasFocus ?? true;
          final shown = focused ? suggestionsFor(options, controller.text, max: options.length) : const <Suggestion>[];
          final scheme = Theme.of(context).colorScheme;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: controller,
                focusNode: focusNode,
                textInputAction: textInputAction,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: required ? '$label *' : label,
                  hintText: hint,
                  errorText: errorText,
                  prefixIcon: icon == null ? null : Icon(icon, size: 20),
                  suffixIcon: focused && controller.text.isNotEmpty
                      ? IconButton(
                          key: const Key('clear-text'),
                          tooltip: context.t.forms.clear,
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            controller.clear();
                            onChanged('');
                          },
                        )
                      : null,
                ),
                onChanged: onChanged,
              ),
              if (shown.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  clipBehavior: Clip.antiAlias,
                  constraints: const BoxConstraints(maxHeight: 264),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: scheme.outlineVariant),
                    boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 8, offset: Offset(0, 3))],
                  ),
                  // The list scrolls on its own; its notifications stop here so the form's drag-to-dismiss does not drop the focus (and the list).
                  child: NotificationListener<ScrollNotification>(
                    onNotification: (_) => true,
                    child: ListView(
                      key: const Key('suggestions'),
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      children: [
                        for (final o in shown)
                          InkWell(
                            key: Key('suggestion-${o.value}'),
                            onTap: () {
                              controller.text = o.label;
                              controller.selection = TextSelection.collapsed(offset: o.label.length);
                              onChanged(o.label);
                            },
                            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16), child: Align(alignment: Alignment.centerLeft, child: Text(o.label, style: const TextStyle(fontSize: 16)))),
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      );
}

/// One row of a form: an icon (or a short text, like a currency code) in a left column, then the field. Keeps the icon level with the
/// field's box even when an error message makes the field taller.
class FormRow extends StatelessWidget {
  const FormRow({super.key, required this.child, this.icon, this.text});

  final Widget child;
  final IconData? icon;
  final String? text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 40,
          height: 56,
          child: Align(
            alignment: Alignment.centerLeft,
            child: icon != null ? Icon(icon, size: 22, color: scheme.onSurface) : Text(text ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

/// The raised panel that groups the secondary fields of a form (category, tags, notes…).
class FormCard extends StatelessWidget {
  const FormCard({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainer, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 16), children[i]]]),
      );
}

class PickerOption {
  const PickerOption(this.value, this.label, {this.hint, this.enabled = true});
  final String value;
  final String label;
  final String? hint;
  final bool enabled;
}

/// Picks one of a short list in a bottom sheet. [none] adds a first entry that returns an empty value ("No budget"). `null` when dismissed.
Future<String?> showOptionSheet(BuildContext context, {required String title, required List<PickerOption> options, String? selected, String? none}) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 8), child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    if (none != null)
                      ListTile(key: const Key('option-none'), title: Text(none), trailing: (selected ?? '').isEmpty ? const Icon(Icons.check) : null, onTap: () => Navigator.of(context).pop('')),
                    for (final o in options)
                      ListTile(
                        key: Key('option-${o.value}'),
                        enabled: o.enabled,
                        title: Text(o.label),
                        subtitle: o.hint == null ? null : Text(o.hint!),
                        trailing: o.value == selected ? const Icon(Icons.check) : null,
                        onTap: () => Navigator.of(context).pop(o.value),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

/// The "Save" pill of a form's app bar.
class SavePill extends StatelessWidget {
  const SavePill({super.key, required this.onPressed, required this.busy});

  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 12),
        child: FilledButton(
          key: const Key('save'),
          onPressed: busy ? null : onPressed,
          style: FilledButton.styleFrom(minimumSize: const Size(80, 40), padding: const EdgeInsets.symmetric(horizontal: 20), shape: const StadiumBorder()),
          child: busy ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2.5)) : Text(context.t.forms.save),
        ),
      );
}
