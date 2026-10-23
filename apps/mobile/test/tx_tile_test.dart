import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide Ref;
import 'package:spacefly_mobile/format/formatter_provider.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/theme/app_theme.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui/tx_tile.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  Future<void> pump(WidgetTester tester, TxRow tx, {VoidCallback? onLongPress}) async {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/meta': metaJson()}));
    addTearDown(() => tester.pumpWidget(const SizedBox()));
    await tester.pumpWidget(UncontrolledProviderScope(
      container: env.container(),
      child: TranslationProvider(
        child: MaterialApp(
          theme: buildTheme(defaultThemeId),
          home: Scaffold(body: Consumer(builder: (_, ref, __) => TxTile(tx: tx, f: ref.watch(formatterProvider), onLongPress: onLongPress))),
        ),
      ),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('another currency shows the original amount and the conversion under it', (tester) async {
    await pump(tester, TxRow.fromJson(txJson(type: 'withdrawal', amount: 5900, originalAmount: 100, originalCurrency: 'USD', rate: 59)));
    expect(find.textContaining('100'), findsWidgets);
    expect(find.textContaining('US\$'), findsOneWidget);
    expect(find.byKey(const Key('tx-converted')), findsOneWidget);
    expect(tester.widget<Text>(find.byKey(const Key('tx-converted'))).data, startsWith('≈ '));
    expect(tester.widget<Text>(find.byKey(const Key('tx-converted'))).data, contains('5,900'));
  });

  testWidgets('the display currency shows a single amount', (tester) async {
    await pump(tester, TxRow.fromJson(txJson(amount: 100)));
    expect(find.byKey(const Key('tx-converted')), findsNothing);
  });

  testWidgets('a transfer stays in its own currency, with no conversion line', (tester) async {
    await pump(tester, TxRow.fromJson(txJson(type: 'transfer', amount: 5900, originalAmount: 100, originalCurrency: 'USD', rate: 59)));
    expect(find.byKey(const Key('tx-converted')), findsNothing);
  });

  testWidgets('a long press is handed to the screen', (tester) async {
    var pressed = 0;
    await pump(tester, TxRow.fromJson(txJson()), onLongPress: () => pressed++);
    await tester.longPress(find.text('Supermercado'));
    expect(pressed, 1);
  });
}
