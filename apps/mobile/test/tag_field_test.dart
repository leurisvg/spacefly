import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/theme/app_theme.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui/form_widgets.dart';

import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  late List<String> tags;

  Future<void> pump(WidgetTester tester, {List<String> initial = const [], List<String> suggestions = const ['viaje', 'casa', 'Comida']}) async {
    tags = [...initial];
    addTearDown(() => tester.pumpWidget(const SizedBox()));
    await tester.pumpWidget(TranslationProvider(
      child: MaterialApp(
        theme: buildTheme(defaultThemeId),
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => SingleChildScrollView(
              child: TagField(key: const Key('tags'), tags: tags, suggestions: suggestions, label: 'Tag', onChanged: (v) => setState(() => tags = v)),
            ),
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();
  }

  Future<void> type(WidgetTester tester, String text) async {
    await tester.enterText(find.byType(TextField), text);
    await tester.pumpAndSettle();
  }

  testWidgets('shows the tags as chips and removes one', (tester) async {
    await pump(tester, initial: ['viaje', 'casa']);
    expect(find.text('#viaje'), findsOneWidget);
    expect(find.text('#casa'), findsOneWidget);
    await tester.tap(find.byTooltip('Remove viaje'));
    await tester.pumpAndSettle();
    expect(tags, ['casa']);
    expect(find.text('#viaje'), findsNothing);
  });

  testWidgets('offers the tags that exist and are not taken, and picking one adds it', (tester) async {
    await pump(tester, initial: ['viaje']);
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('suggestion-casa')), findsOneWidget);
    expect(find.byKey(const Key('suggestion-viaje')), findsNothing, reason: 'it is already there');

    await tester.tap(find.byKey(const Key('suggestion-casa')));
    await tester.pumpAndSettle();
    expect(tags, ['viaje', 'casa']);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
  });

  testWidgets('a new tag is added from the "Add" row, with the keyboard action, or by a comma', (tester) async {
    await pump(tester);
    await tester.tap(find.byType(TextField));
    await type(tester, 'oferta');
    expect(find.text('Add “oferta”'), findsOneWidget);
    await tester.tap(find.byKey(const Key('suggestion-create')));
    await tester.pumpAndSettle();
    expect(tags, ['oferta']);

    await type(tester, '#regalo');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(tags, ['oferta', 'regalo'], reason: 'a leading # is not part of the name');

    await type(tester, 'uno, dos,tres');
    expect(tags, ['oferta', 'regalo', 'uno', 'dos']);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, 'tres');
  });

  testWidgets('the same tag is not added twice, whatever its case or accents', (tester) async {
    await pump(tester, initial: ['comida']);
    await tester.tap(find.byType(TextField));
    await type(tester, 'COMIDA');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(tags, ['comida']);
  });
}
