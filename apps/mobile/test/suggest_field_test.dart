import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/ui/form_widgets.dart';
import 'package:spacefly_mobile/ui_logic/suggest.dart';

void main() {
  testWidgets('lists every match and scrolling that list keeps the field focused', (tester) async {
    final controller = TextEditingController();
    final focus = FocusNode();
    addTearDown(() {
      controller.dispose();
      focus.dispose();
    });
    final options = [for (var i = 1; i <= 20; i++) Suggestion('c$i', 'Category ${i.toString().padLeft(2, '0')}')];

    // The form's list drops the focus when it is dragged, like the transaction form.
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(16),
          children: [
            SuggestField(controller: controller, focusNode: focus, label: 'Category', options: options, onChanged: (_) {}),
            const SizedBox(height: 1200),
          ],
        ),
      ),
    ));

    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(focus.hasFocus, isTrue);
    expect(find.byKey(const Key('suggestion-c1')), findsOneWidget);
    expect(find.byKey(const Key('suggestion-c20')), findsNothing, reason: 'off screen, but in the list');

    for (var i = 0; i < 4; i++) {
      await tester.drag(find.byKey(const Key('suggestions')), const Offset(0, -300));
      await tester.pumpAndSettle();
    }
    await tester.pumpAndSettle();
    expect(focus.hasFocus, isTrue);
    expect(find.byKey(const Key('suggestion-c20')), findsOneWidget);
  });

  group('suggestionsPlacement', () {
    test('goes under the field, as tall as the room allows', () {
      final p = suggestionsPlacement(fieldTop: 100, fieldBottom: 156, visibleTop: 24, visibleBottom: 800);
      expect((p.below, p.height), (true, 264.0));
      final tight = suggestionsPlacement(fieldTop: 100, fieldBottom: 156, visibleTop: 24, visibleBottom: 300);
      expect((tight.below, tight.height), (true, 140.0));
    });

    test('goes over the field when the keyboard leaves no room below', () {
      final p = suggestionsPlacement(fieldTop: 500, fieldBottom: 556, visibleTop: 24, visibleBottom: 600);
      expect(p.below, isFalse);
      expect(p.height, 264.0);
      final small = suggestionsPlacement(fieldTop: 200, fieldBottom: 256, visibleTop: 24, visibleBottom: 300);
      expect((small.below, small.height), (false, 172.0));
    });
  });

  testWidgets('the list floats over the form: what is under the field does not move', (tester) async {
    final controller = TextEditingController();
    final focus = FocusNode();
    addTearDown(() {
      controller.dispose();
      focus.dispose();
    });
    final options = [for (var i = 1; i <= 5; i++) Suggestion('c$i', 'Category $i')];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SuggestField(controller: controller, focusNode: focus, label: 'Category', options: options, onChanged: (_) {}),
            const SizedBox(height: 24),
            const Text('Under the field', key: Key('under')),
          ],
        ),
      ),
    ));
    final before = tester.getTopLeft(find.byKey(const Key('under')));
    expect(find.byKey(const Key('suggestions')), findsNothing);

    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('suggestions')), findsOneWidget);
    // (the field itself grows a couple of pixels when focused: the list is more than 150 high)
    expect(tester.getTopLeft(find.byKey(const Key('under'))).dy, closeTo(before.dy, 4), reason: 'the list does not push the rest down');
    expect(tester.getSize(find.byKey(const Key('suggestions'))).height, greaterThan(150));
    final list = tester.getRect(find.byKey(const Key('suggestions')));
    final field = tester.getRect(find.byType(TextField));
    expect(list.top, greaterThanOrEqualTo(field.bottom), reason: 'right under the field');
    expect(list.width, closeTo(field.width, 3), reason: 'as wide as the field (inside its border)');
  });
}
