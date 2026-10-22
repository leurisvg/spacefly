import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/theme/app_theme.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';

void main() {
  test('there is a theme for every id, and the generated tokens are complete', () {
    expect(themeTokens.keys, unorderedEquals(ThemeId.values));
    for (final tokens in themeTokens.values) {
      expect(tokens.series, hasLength(8));
    }
  });

  for (final id in ThemeId.values) {
    test('${id.name}: Material colors come from the tokens', () {
      final tokens = themeTokens[id]!;
      final theme = buildTheme(id);
      expect(theme.useMaterial3, isTrue);
      expect(theme.colorScheme.primary, tokens.accent);
      expect(theme.colorScheme.surface, tokens.background);
      expect(theme.colorScheme.onSurface, tokens.chartInk);
      expect(theme.colorScheme.error, tokens.moneyExpense);
      expect(theme.scaffoldBackgroundColor, tokens.background);
      expect(theme.extension<SpaceflyColors>()!.tokens, same(tokens));
    });

    test('${id.name}: text on the accent and on the surface is readable', () {
      final scheme = buildTheme(id).colorScheme;
      double contrast(Color a, Color b) {
        final l1 = a.computeLuminance(), l2 = b.computeLuminance();
        return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
      }

      expect(contrast(scheme.onPrimary, scheme.primary), greaterThan(3));
      expect(contrast(scheme.onSurface, scheme.surface), greaterThan(7));
    });
  }
}
