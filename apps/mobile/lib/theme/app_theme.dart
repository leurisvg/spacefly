import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'tokens.g.dart';

/// The palette of the active theme, for widgets that need more than Material's color roles (money colors, chart series).
@immutable
class SpaceflyColors extends ThemeExtension<SpaceflyColors> {
  const SpaceflyColors(this.tokens);
  final ThemeTokens tokens;

  @override
  SpaceflyColors copyWith({ThemeTokens? tokens}) => SpaceflyColors(tokens ?? this.tokens);

  // Themes switch instantly; there is nothing to interpolate between two palettes.
  @override
  SpaceflyColors lerp(SpaceflyColors? other, double t) => t < 0.5 || other == null ? this : other;
}

extension SpaceflyTheme on BuildContext {
  ThemeTokens get tokens => Theme.of(this).extension<SpaceflyColors>()!.tokens;
}

const _lightInk = Colors.white;
const _darkInk = Color(0xFF11151A);

double _contrast(Color a, Color b) {
  final l1 = a.computeLuminance(), l2 = b.computeLuminance();
  return (math.max(l1, l2) + 0.05) / (math.min(l1, l2) + 0.05);
}

/// Text color for a filled surface: whichever of white and near-black reads better on it.
Color onColor(Color background) => _contrast(_lightInk, background) >= _contrast(_darkInk, background) ? _lightInk : _darkInk;

/// The families of the web: Inter for text, JetBrains Mono for figures. See the `fonts` of pubspec.yaml.
const textFontFamily = 'Inter';
const numberFontFamily = 'JetBrains Mono';

/// The Material 3 theme of a SpaceFly theme: the surface colors, the ink and the accent come from the generated tokens.
ThemeData buildTheme(ThemeId id) {
  final t = themeTokens[id]!;
  final scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: t.accent,
    onPrimary: onColor(t.accent),
    secondary: t.moneyNet,
    onSecondary: onColor(t.moneyNet),
    tertiary: t.moneyRevenue,
    onTertiary: onColor(t.moneyRevenue),
    error: t.moneyExpense,
    onError: onColor(t.moneyExpense),
    surface: t.background,
    onSurface: t.chartInk,
    onSurfaceVariant: t.chartInk2,
    outline: t.chartAxis,
    outlineVariant: t.chartGrid,
    surfaceContainerLowest: t.background,
    surfaceContainerLow: t.background,
    surfaceContainer: t.chartSurface,
    surfaceContainerHigh: t.chartSurface,
    surfaceContainerHighest: t.chartSurface,
    primaryContainer: Color.alphaBlend(t.accent.withValues(alpha: 0.28), t.chartSurface),
    onPrimaryContainer: t.chartInk,
    secondaryContainer: Color.alphaBlend(t.accent.withValues(alpha: 0.28), t.chartSurface),
    onSecondaryContainer: t.chartInk,
    inverseSurface: t.chartInk,
    onInverseSurface: t.background,
  );

  OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: color, width: width));

  return ThemeData(
    useMaterial3: true,
    fontFamily: textFontFamily,
    colorScheme: scheme,
    scaffoldBackgroundColor: t.background,
    extensions: [SpaceflyColors(t)],
    appBarTheme: AppBarTheme(backgroundColor: t.background, foregroundColor: t.chartInk, elevation: 0, scrolledUnderElevation: 0, centerTitle: false),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: t.chartSurface,
      indicatorColor: scheme.primaryContainer,
      labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 12, color: t.chartInk2)),
    ),
    cardTheme: CardTheme(color: t.chartSurface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: t.chartGrid))),
    inputDecorationTheme: InputDecorationTheme(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
      floatingLabelStyle: WidgetStateTextStyle.resolveWith(
        (states) => TextStyle(color: states.contains(WidgetState.error) ? t.moneyExpense : (states.contains(WidgetState.focused) ? t.accent : t.chartInk2)),
      ),
      border: border(t.chartAxis),
      enabledBorder: border(t.chartAxis),
      focusedBorder: border(t.accent, 2),
      errorBorder: border(t.moneyExpense),
      focusedErrorBorder: border(t.moneyExpense, 2),
      labelStyle: TextStyle(color: t.chartInk2),
      helperStyle: TextStyle(color: t.chartMuted),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))),
    dividerTheme: DividerThemeData(color: t.chartGrid, space: 1),
    snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: t.chartTooltip, contentTextStyle: TextStyle(color: t.chartInk)),
  );
}
