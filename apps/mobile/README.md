# SpaceFly mobile (Flutter)

The Android and iOS app. Rules, structure and commands are in the root [CLAUDE.md](../../CLAUDE.md) (section "Mobile (Flutter)"); the screens and their web counterparts in [docs/parity.md](../../docs/parity.md).

```bash
npm run dev:mobile -- --dart-define=API_URL=http://10.0.2.2:3100   # from the repo root; 10.0.2.2 is the host as seen by the Android emulator
npm run test:mobile      # flutter analyze + flutter test
npm run gen:mobile       # regenerate lib/api/models.g.dart, lib/theme/tokens.g.dart and lib/i18n/* (never edit them by hand)
```

## Release builds

**Android.** A release build is signed with `android/key.properties` when it exists, and with the debug key when it does not (so `flutter run --release` and CI keep working). The file and the keystore are ignored by git:

```bash
keytool -genkey -v -keystore ~/spacefly-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias spacefly
# apps/mobile/android/key.properties
storePassword=…
keyPassword=…
keyAlias=spacefly
storeFile=/Users/you/spacefly-upload.jks
```

Then `npm run build:mobile:android` (or `flutter build appbundle`). Keep the keystore and its passwords somewhere safe: an app signed with a lost key can't be updated.

**iOS.** The project is configured (deployment target 12.0, icons, dark launch screen) but has never been built here. On a Mac: accept the Xcode license (`sudo xcodebuild -license`), fix CocoaPods (`pod --version` must work), open `ios/Runner.xcworkspace` once to pick the signing team and a bundle id of your own, then `flutter build ipa`.

**Icons and launch screens.** Both platforms are drawn from the web's logo by `python3 -I tool/make_icons.py` (Pillow and fontTools). The Android launch background is the default theme's color in `res/values/colors.xml`.

**While the app is away.** After 5 minutes in the background it refetches its data when it comes back; Android keeps the amounts out of the recent-apps thumbnail (`MainActivity`), and on iOS the app covers itself while it is not active.
