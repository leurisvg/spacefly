import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/models.g.dart';
import '../format/formatter.dart';
import 'filters_store.dart';

/// The lists the filters offer, from `/api/lookups`.
class Lookups {
  const Lookups({this.categories = const [], this.tags = const [], this.budgets = const [], this.accounts = const []});

  factory Lookups.fromJson(Map<String, dynamic> json) {
    List<LookupItem> list(String key) => [for (final x in (json[key] as List? ?? const [])) LookupItem(x['id'].toString(), x['name'].toString())];
    return Lookups(categories: list('categories'), tags: list('tags'), budgets: list('budgets'), accounts: list('accounts'));
  }

  final List<LookupItem> categories;
  final List<LookupItem> tags;
  final List<LookupItem> budgets;
  final List<LookupItem> accounts;
}

class LookupItem {
  const LookupItem(this.id, this.name);
  final String id;
  final String name;
}

/// Firefly/server metadata, loaded once per session.
final metaProvider = FutureProvider<MetaResponse>((ref) async {
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/meta');
  return MetaResponse.fromJson(response.data!);
});

/// Who is signed in, as the server sees the session.
final meProvider = FutureProvider<MeResponse>((ref) async {
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/me');
  return MeResponse.fromJson(response.data!);
});

/// The signed-in user's email: the one in the server's metadata, else the session's (`/api/me`); empty when neither says.
/// Port of `email` in libs/client/src/features/settings/preferences.vm.ts.
final emailProvider = Provider<String>((ref) {
  final fromMeta = ref.watch(metaProvider).valueOrNull?.email ?? '';
  if (fromMeta.isNotEmpty) return fromMeta;
  return ref.watch(meProvider).valueOrNull?.email ?? '';
});

/// Categories, tags, budgets and accounts for the filters; refetched when the user refreshes.
final lookupsProvider = FutureProvider<Lookups>((ref) async {
  final tick = ref.watch(filtersProvider.select((f) => f.refreshTick));
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/lookups', queryParameters: {'_r': tick});
  return Lookups.fromJson(response.data!);
});

final primaryCurrencyProvider = Provider<String>((ref) => ref.watch(metaProvider).valueOrNull?.primaryCurrency.code ?? 'DOP');

final currenciesProvider = Provider<List<CurrencyInfo>>((ref) => ref.watch(metaProvider).valueOrNull?.displayCurrencies ?? fallbackCurrencies);

/// Deep link to a page of the user's Firefly, or `null` when the public URL is not known yet.
String? fireflyUrl(MetaResponse? meta, String path) {
  final base = meta?.fireflyPublicUrl;
  return base == null || base.isEmpty ? null : '$base$path';
}
