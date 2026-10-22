import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config.dart';
import 'stores.dart';

const _apiUrlKey = 'spacefly.apiUrl';
const _tokenKey = 'spacefly.token';
const _cfIdKey = 'spacefly.cf.clientId';
const _cfSecretKey = 'spacefly.cf.clientSecret';

final _urlPattern = RegExp(r'^https?://[^\s/?#]+(/[^\s?#]*)?$', caseSensitive: false);

/// `https://spacefly.example.com/` → `https://spacefly.example.com`; anything that isn't an http(s) URL → `null`.
String? normalizeServerUrl(String input) {
  final trimmed = input.trim().replaceFirst(RegExp(r'/+$'), '');
  return _urlPattern.hasMatch(trimmed) ? trimmed : null;
}

/// Where the server is and how to authenticate to it: the URL and the Access credentials from the settings, the session
/// token after login.
class ServerConfig {
  const ServerConfig({this.apiUrl = '', this.token, this.accessClientId = '', this.accessClientSecret = ''});

  final String apiUrl;
  final String? token;
  final String accessClientId;
  final String accessClientSecret;

  bool get configured => normalizeServerUrl(apiUrl) != null;
  bool get signedIn => token != null;
  bool get hasAccessCredentials => accessClientId.isNotEmpty && accessClientSecret.isNotEmpty;

  ServerConfig copyWith({String? apiUrl, Object? token = _keep, String? accessClientId, String? accessClientSecret}) => ServerConfig(
        apiUrl: apiUrl ?? this.apiUrl,
        token: identical(token, _keep) ? this.token : token as String?,
        accessClientId: accessClientId ?? this.accessClientId,
        accessClientSecret: accessClientSecret ?? this.accessClientSecret,
      );
}

const _keep = Object();

/// Reads what is persisted. Done once in `main()` (the router and the HTTP client need it synchronously).
Future<ServerConfig> loadServerConfig(KeyValueStore prefs, CredentialStore secure) async => ServerConfig(
      apiUrl: prefs.getString(_apiUrlKey) ?? apiUrlFromEnv,
      token: await secure.read(_tokenKey),
      accessClientId: await secure.read(_cfIdKey) ?? '',
      accessClientSecret: await secure.read(_cfSecretKey) ?? '',
    );

/// Overridden in `main()` with the loaded config.
final initialServerConfigProvider = Provider<ServerConfig>((ref) => const ServerConfig());

final serverConfigProvider = NotifierProvider<ServerConfigNotifier, ServerConfig>(ServerConfigNotifier.new);

class ServerConfigNotifier extends Notifier<ServerConfig> {
  @override
  ServerConfig build() => ref.watch(initialServerConfigProvider);

  KeyValueStore get _prefs => ref.read(keyValueStoreProvider);
  CredentialStore get _secure => ref.read(credentialStoreProvider);

  /// Saves the server URL; `false` when it is not an http(s) URL.
  Future<bool> setApiUrl(String value) async {
    final url = normalizeServerUrl(value);
    if (url == null) return false;
    await _prefs.setString(_apiUrlKey, url);
    state = state.copyWith(apiUrl: url);
    return true;
  }

  Future<void> setToken(String? token) async {
    if (token != null) {
      await _secure.write(_tokenKey, token);
    } else {
      await _secure.delete(_tokenKey);
    }
    state = state.copyWith(token: token);
  }

  /// Empty values remove the credential.
  Future<void> setAccessCredentials(String clientId, String clientSecret) async {
    final id = clientId.trim();
    final secret = clientSecret.trim();
    for (final (key, value) in [(_cfIdKey, id), (_cfSecretKey, secret)]) {
      if (value.isNotEmpty) {
        await _secure.write(key, value);
      } else {
        await _secure.delete(key);
      }
    }
    state = state.copyWith(accessClientId: id, accessClientSecret: secret);
  }
}
