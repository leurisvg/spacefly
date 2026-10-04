// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Browser globals that do not exist (or behave differently) in NativeScript. */
const DOM_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'location',
  'navigator',
  'history',
  'getComputedStyle',
  'matchMedia',
  'requestAnimationFrame',
  'alert',
  'confirm',
  'prompt',
];

module.exports = defineConfig([
  {
    ignores: [
      'apps/web/src/libs/ui/**',
      'dist/**',
      '**/node_modules/**',
      'apps/mobile/platforms/**',
      'apps/mobile/hooks/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'sf',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'sf',
          style: 'kebab-case',
        },
      ],
    },
  },
  // ── Architecture boundaries (see CLAUDE.md) ───────────────────────────────────
  // libs/client runs on the web and in NativeScript: no DOM, no web UI kits, no NativeScript, no app code.
  {
    files: ['libs/client/**/*.ts', 'libs/shared/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...DOM_GLOBALS.map((name) => ({
          name,
          message:
            'Not available on every platform: go through a token in libs/client/src/platform.',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@spartan-ng/*',
                '@ng-icons/*',
                '@angular/cdk',
                '@angular/cdk/*',
                'ngx-*',
                '@angular/platform-browser',
                '@angular/platform-browser/*',
              ],
              message: 'Web-only dependency: keep it in apps/web.',
            },
            {
              group: ['@nativescript/*', '@nativescript-community/*'],
              message: 'NativeScript-only dependency: keep it in apps/mobile.',
            },
            {
              group: ['**/apps/*', '@spacefly/web', '@spacefly/mobile', '@spacefly/server'],
              message: 'Libraries never import apps.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Decorator[expression.callee.name='Component']",
          message: 'Components are platform-specific: libs/client exposes view-models instead.',
        },
      ],
    },
  },
  // libs/shared is plain TypeScript: DTOs and pure helpers, shared with the server.
  {
    files: ['libs/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/*',
                'rxjs',
                'rxjs/*',
                '@jsverse/*',
                '@spartan-ng/*',
                '@nativescript/*',
                '**/apps/*',
                '@spacefly/client',
                '@spacefly/client/*',
              ],
              message: 'libs/shared must stay framework-free (the server depends on it).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nativescript/*', '@nativescript-community/*', '**/apps/mobile/*'],
              message: 'apps/web must not import NativeScript or the mobile app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/mobile/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@spartan-ng/*',
                '@ng-icons/*',
                '@angular/cdk',
                '@angular/cdk/*',
                'ngx-*',
                '@angular/platform-browser',
                '@angular/platform-browser/*',
                '**/apps/web/*',
              ],
              message: 'Web-only dependency: not available in NativeScript.',
            },
          ],
        },
      ],
    },
  },
  // NativeScript templates are not HTML: `<Label>` is a text view, not a `<label>`, so the web a11y rules do not apply.
  {
    files: ['apps/mobile/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'ns', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'ns', style: 'kebab-case' }],
    },
  },
  {
    // The native bridges (Java/Objective-C classes) are untyped by nature.
    files: ['apps/mobile/**/*.android.ts', 'apps/mobile/**/*.ios.ts', 'apps/mobile/src/app/platform/pkce.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Spartan directives (hlmSidebarRail, hlmSidebarTrigger) render the button content.
      '@angular-eslint/template/elements-content': [
        'error',
        { allowList: ['hlmSidebarRail', 'hlmSidebarTrigger'] },
      ],
      '@angular-eslint/template/label-has-associated-control': [
        'error',
        { controlComponents: ['hlm-switch', 'sf-select'] },
      ],
    },
  },
  {
    files: ['apps/mobile/**/*.html'],
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/elements-content': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
    },
  },
]);
