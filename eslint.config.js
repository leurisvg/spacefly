// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Browser globals that libs/client and libs/shared must not touch: go through a platform token. */
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
  // libs/client must stay free of the browser: no DOM, no web UI kits, no NativeScript, no app code.
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
              message: 'Platform-specific dependency: libs/client stays free of native runtimes.',
            },
            {
              group: ['**/apps/*', '@spacefly/web', '@spacefly/server'],
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
]);
