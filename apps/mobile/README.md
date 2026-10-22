# SpaceFly mobile (Flutter)

The Android and iOS app. Rules, structure and commands are in the root [CLAUDE.md](../../CLAUDE.md) (section "Mobile (Flutter)"); the screens and their web counterparts in [docs/parity.md](../../docs/parity.md).

```bash
npm run dev:mobile -- --dart-define=API_URL=http://10.0.2.2:3100   # from the repo root; 10.0.2.2 is the host as seen by the Android emulator
npm run test:mobile      # flutter analyze + flutter test
npm run gen:mobile       # regenerate lib/api/models.g.dart, lib/theme/tokens.g.dart and lib/i18n/* (never edit them by hand)
```
