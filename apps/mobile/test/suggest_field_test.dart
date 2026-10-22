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
}
