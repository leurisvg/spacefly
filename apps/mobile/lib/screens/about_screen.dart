import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../i18n/strings.g.dart';
import '../state/meta_store.dart';
import '../ui/common.dart';

/// The app and Firefly versions, whether Firefly is recent enough, who is signed in and where.
class AboutScreen extends ConsumerWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final meta = ref.watch(metaProvider);
    final m = meta.valueOrNull;
    final scheme = Theme.of(context).colorScheme;

    Widget row(String label, Widget value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [SizedBox(width: 130, child: Text(label, style: TextStyle(color: scheme.onSurfaceVariant))), Expanded(child: value)],
          ),
        );

    return Scaffold(
      appBar: AppBar(title: Text(t.nav.about)),
      body: ListView(
        key: const Key('about'),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
        children: [
          SectionCard(
            title: 'SpaceFly',
            child: m == null
                ? (meta.hasError ? EmptyState(title: t.errors.load, onRetry: () => ref.invalidate(metaProvider)) : const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      row(t.about.version, Text(m.appVersion, style: numStyle(context, size: 14))),
                      row(
                        'Firefly III',
                        Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(m.fireflyVersion, style: numStyle(context, size: 14)),
                            Container(
                              key: const Key('version-status'),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: (m.fireflyVersionOk ? scheme.secondaryContainer : scheme.errorContainer), borderRadius: BorderRadius.circular(20)),
                              child: Text(m.fireflyVersionOk ? t.about.supported(min: m.minFireflyVersion) : t.about.unsupported(min: m.minFireflyVersion), style: TextStyle(fontSize: 11, color: m.fireflyVersionOk ? scheme.onSecondaryContainer : scheme.onErrorContainer)),
                            ),
                          ],
                        ),
                      ),
                      row(t.about.primary, Text('${m.primaryCurrency.name} (${m.primaryCurrency.code})')),
                      row(t.about.user, Text(m.email)),
                      row(
                        t.about.instance,
                        InkWell(
                          key: const Key('instance-link'),
                          onTap: () => launchUrl(Uri.parse(m.fireflyPublicUrl), mode: LaunchMode.externalApplication),
                          child: Text(m.fireflyPublicUrl, style: TextStyle(color: scheme.primary, decoration: TextDecoration.underline)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(t.about.body, style: TextStyle(color: scheme.onSurfaceVariant)),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
