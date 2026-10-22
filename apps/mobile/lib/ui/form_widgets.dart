import 'package:flutter/material.dart';

import '../i18n/strings.g.dart';
import '../ui_logic/suggest.dart';

/// An outlined field that opens a picker when tapped: dates, times, accounts, budgets. Shows [value], or [placeholder] while empty.
class TapField extends StatelessWidget {
  const TapField({super.key, required this.label, required this.onTap, this.value = '', this.placeholder, this.icon, this.errorText, this.required = false, this.trailing});

  final String label;
  final String value;
  final String? placeholder;
  final IconData? icon;
  final String? errorText;
  final bool required;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        isEmpty: value.isEmpty,
        isFocused: false,
        decoration: InputDecoration(
          labelText: required ? '$label *' : label,
          errorText: errorText,
          prefixIcon: icon == null ? null : Icon(icon, size: 20),
          suffixIcon: trailing ?? const Icon(Icons.arrow_drop_down),
          floatingLabelBehavior: value.isEmpty && placeholder == null ? FloatingLabelBehavior.auto : FloatingLabelBehavior.always,
        ),
        child: Text(value.isEmpty ? (placeholder ?? '') : value, maxLines: 1, overflow: TextOverflow.ellipsis, style: value.isEmpty ? TextStyle(color: scheme.onSurfaceVariant) : null),
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
                decoration: InputDecoration(labelText: required ? '$label *' : label, hintText: hint, errorText: errorText, prefixIcon: icon == null ? null : Icon(icon, size: 20)),
                onChanged: onChanged,
              ),
              if (shown.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  clipBehavior: Clip.antiAlias,
                  constraints: const BoxConstraints(maxHeight: 264),
                  decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(12), border: Border.all(color: scheme.outlineVariant)),
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
                            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), child: Align(alignment: Alignment.centerLeft, child: Text(o.label))),
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
