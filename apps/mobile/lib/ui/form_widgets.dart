import 'package:flutter/material.dart';

import '../i18n/strings.g.dart';
import '../ui_logic/fold.dart';
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
    this.helperText,
    this.required = false,
    this.trailing,
    this.dense = false,
  });

  final String label;
  final String value;
  final String? placeholder;
  final IconData? icon;
  final String? errorText;

  /// A neutral note under the box, shown while there is no error.
  final String? helperText;
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
          helperText: helperText,
          helperMaxLines: 2,
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
    this.onPick,
    this.onSubmitted,
    this.createLabel,
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

  /// When set, picking an option calls this instead of filling the field (a field that collects several values, like tags).
  final void Function(Suggestion option)? onPick;

  /// Called with the text when the keyboard's action is pressed.
  final void Function(String text)? onSubmitted;

  /// When set, a row "Add “text”" tops the list while the text is not one of the options; it calls [onSubmitted].
  final String Function(String text)? createLabel;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Listenable.merge([controller, if (focusNode != null) focusNode!]),
        builder: (context, _) {
          final focused = focusNode?.hasFocus ?? true;
          final shown = focused ? suggestionsFor(options, controller.text, max: options.length) : const <Suggestion>[];
          final typed = controller.text.trim();
          final creatable = createLabel != null && focused && typed.isNotEmpty && !options.any((o) => o.label.toLowerCase() == typed.toLowerCase());
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
                onSubmitted: onSubmitted,
              ),
              if (shown.isNotEmpty || creatable)
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
                        if (creatable)
                          InkWell(
                            key: const Key('suggestion-create'),
                            onTap: () => onSubmitted?.call(typed),
                            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16), child: Align(alignment: Alignment.centerLeft, child: Text(createLabel!(typed), style: TextStyle(fontSize: 16, color: scheme.primary)))),
                          ),
                        for (final o in shown)
                          InkWell(
                            key: Key('suggestion-${o.value}'),
                            onTap: () {
                              if (onPick != null) {
                                onPick!(o);
                                return;
                              }
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

/// The tags of a record as chips, with a field to add more: pick a suggestion, or type a new one and press the keyboard's action (or a
/// comma). Port of apps/web/src/app/shared/forms/tag-input.ts.
class TagField extends StatefulWidget {
  const TagField({super.key, required this.tags, required this.suggestions, required this.onChanged, required this.label, this.errorText});

  final List<String> tags;
  final List<String> suggestions;
  final void Function(List<String> tags) onChanged;
  final String label;
  final String? errorText;

  @override
  State<TagField> createState() => _TagFieldState();
}

class _TagFieldState extends State<TagField> {
  final _text = TextEditingController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  /// [tags] with [raw] added: without a leading `#`, and only when it is not there already (ignoring case and accents).
  static List<String> _with(List<String> tags, String raw) {
    final tag = raw.trim().replaceFirst(RegExp(r'^#'), '');
    return tag.isEmpty || tags.any((x) => fold(x) == fold(tag)) ? tags : [...tags, tag];
  }

  bool _has(String tag) => widget.tags.any((x) => fold(x) == fold(tag));

  void _add(String raw) {
    _text.clear();
    final next = _with(widget.tags, raw);
    if (next.length != widget.tags.length) widget.onChanged(next);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.tags.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Wrap(
              key: const Key('tag-chips'),
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final tag in widget.tags)
                  InputChip(
                    key: Key('tag-$tag'),
                    label: Text('#$tag'),
                    visualDensity: VisualDensity.compact,
                    deleteButtonTooltipMessage: t.forms.tags.remove(tag: tag),
                    onDeleted: () => widget.onChanged([for (final x in widget.tags) if (x != tag) x]),
                  ),
              ],
            ),
          ),
        SuggestField(
          controller: _text,
          focusNode: _focus,
          label: widget.label,
          hint: t.forms.tags.placeholder,
          errorText: widget.errorText,
          textInputAction: TextInputAction.done,
          options: [for (final s in widget.suggestions) if (!_has(s)) Suggestion(s, s)],
          createLabel: (name) => t.forms.tags.add(name: name),
          onPick: (o) => _add(o.label),
          onSubmitted: _add,
          // a comma ends the tag, like on the web's chip field
          onChanged: (v) {
            if (!v.contains(',')) return;
            final parts = v.split(',');
            var next = widget.tags;
            for (final p in parts.take(parts.length - 1)) {
              next = _with(next, p);
            }
            if (next.length != widget.tags.length) widget.onChanged(next);
            _text.text = parts.last;
            _text.selection = TextSelection.collapsed(offset: parts.last.length);
          },
        ),
      ],
    );
  }
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
