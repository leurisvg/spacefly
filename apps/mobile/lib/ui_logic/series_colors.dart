import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/preferences.dart';
import '../theme/tokens.g.dart';

/// Color follows the entity, never its rank: the first time an entity (category, account…) is drawn it takes the next free categorical
/// slot and keeps it for the whole session, so filters never repaint survivors. Past 8 entities of a kind, charts fold into "Other".
/// Port of libs/client/src/charts/series-colors.ts. The colors come from the active theme.
class SeriesColors {
  SeriesColors(this._tokens);

  final ThemeTokens Function() _tokens;
  final Map<String, Map<String, int>> _slots = {};

  int? slot(String kind, String? id) {
    final key = id ?? '__none__';
    final map = _slots.putIfAbsent(kind, () => {});
    if (!map.containsKey(key)) {
      if (map.length >= _tokens().series.length) return null;
      map[key] = map.length;
    }
    return map[key];
  }

  Color color(String kind, String? id) {
    final s = slot(kind, id);
    return s == null ? _tokens().moneyOther : _tokens().series[s];
  }

  Color other() => _tokens().moneyOther;
}

/// One per session; reads the theme at the time a color is asked for.
final seriesColorsProvider = Provider<SeriesColors>((ref) => SeriesColors(() => themeTokens[ref.read(preferencesProvider).theme]!));
