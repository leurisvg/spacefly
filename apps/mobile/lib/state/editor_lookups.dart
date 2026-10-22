import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/models.g.dart' hide Ref;
import 'filters_store.dart';

/// Everything the editors pick from (accounts of every kind, categories, tags…), refetched after each write.
/// Port of libs/client/src/state/editor-lookups.store.ts.
final editorLookupsProvider = FutureProvider<EditorLookups>((ref) async {
  final tick = ref.watch(filtersProvider.select((f) => f.refreshTick));
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/lookups/editor', queryParameters: {'_r': tick});
  return EditorLookups.fromJson(response.data!);
});
