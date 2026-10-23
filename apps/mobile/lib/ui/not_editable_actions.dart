import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../features/transactions/transaction_actions.dart';
import '../i18n/strings.g.dart';

/// What can still be done with a transaction SpaceFly doesn't edit (several parts, or another type): edit it in Firefly, go back or
/// delete it. Port of the buttons of apps/web/src/app/features/transactions/transaction-form.ts.
class NotEditableActions extends ConsumerWidget {
  const NotEditableActions({super.key, required this.groupId, required this.name, required this.reason, required this.onBack, this.fireflyEditUrl});

  final String groupId;
  final String name;

  /// `splits` or `type`, as the 409 says.
  final String? reason;
  final VoidCallback onBack;
  final String? fireflyEditUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final url = fireflyEditUrl;
    const size = Size.fromHeight(52);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (url != null) ...[
          FilledButton.icon(
            key: const Key('edit-firefly'),
            style: FilledButton.styleFrom(minimumSize: size),
            icon: const Icon(Icons.open_in_new),
            label: Text(t.editor.tx.editInFirefly),
            onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
          ),
          const SizedBox(height: 8),
        ],
        OutlinedButton(key: const Key('not-editable-back'), style: OutlinedButton.styleFrom(minimumSize: size), onPressed: onBack, child: Text(t.editor.back)),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          key: const Key('not-editable-delete'),
          style: OutlinedButton.styleFrom(minimumSize: size, foregroundColor: Theme.of(context).colorScheme.error),
          icon: const Icon(Icons.delete_outline),
          label: Text(t.forms.delete),
          // The 409 doesn't say how many parts there are: 2 is enough to pick the message about parts.
          onPressed: () => ref.read(transactionActionsProvider).remove(groupId: groupId, name: name, splitCount: reason == 'splits' ? 2 : 1),
        ),
      ],
    );
  }
}
