import '../i18n/strings.g.dart';

const othersId = '__others__';

/// Display name for an entity whose name may be empty (uncategorized, untagged, "others"…).
/// Port of `I18n.name` in libs/client/src/i18n/i18n.ts; [fallback] picks the catalog text used when the name is empty.
String entityName(Translations t, String? name, String? id, {String Function(Translations t)? fallback}) {
  if (id == othersId) return t.common.others;
  if (name != null && name.isNotEmpty) return name;
  return fallback == null ? t.common.uncategorized : fallback(t);
}
