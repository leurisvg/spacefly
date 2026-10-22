/**
 * Strings for the Flutter app: the web catalogs (libs/i18n/src/{es,en}.json) are copied next to the app and compiled by slang.
 *
 *   npm run gen:mobile  →  apps/mobile/lib/i18n/{en,es}.i18n.json + strings.g.dart
 *
 * The catalog is the one the web uses (Transloco, `{{name}}` interpolation), so slang runs with `string_interpolation: double_braces`.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const APP = join(ROOT, 'apps/mobile');
const OUT = join(APP, 'lib/i18n');

mkdirSync(OUT, { recursive: true });
for (const lang of ['en', 'es']) copyFileSync(join(ROOT, `libs/i18n/src/${lang}.json`), join(OUT, `${lang}.i18n.json`));

/** `dart` from the PATH, else the Flutter SDK the repo documents in ~/flutter. */
const dart = [join(homedir(), 'flutter/bin/dart')].find(existsSync) ?? 'dart';
execFileSync(process.env['DART'] ?? dart, ['run', 'slang'], { cwd: APP, stdio: 'inherit' });
console.log('i18n: apps/mobile/lib/i18n');
