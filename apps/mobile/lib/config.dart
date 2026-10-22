/// Server URL baked in at build time (`--dart-define=API_URL=http://10.0.2.2:3100`). It only pre-fills the server screen:
/// the URL the user saves wins.
const apiUrlFromEnv = String.fromEnvironment('API_URL');

/// The deep link the system browser ends on. Registered in AndroidManifest.xml (flutter_web_auth_2 `CallbackActivity`) and
/// allowed by the server's `MOBILE_REDIRECT_URIS`.
const redirectUri = 'spacefly://auth/callback';
const callbackScheme = 'spacefly';
