// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  { ignores: ['apps/web/src/libs/ui/**', 'dist/**', '**/node_modules/**', 'apps/mobile/platforms/**', 'apps/mobile/hooks/**'] },
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
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Spartan directives (hlmSidebarRail, hlmSidebarTrigger) render the button content.
      '@angular-eslint/template/elements-content': ['error', { allowList: ['hlmSidebarRail', 'hlmSidebarTrigger'] }],
      '@angular-eslint/template/label-has-associated-control': ['error', { controlComponents: ['hlm-switch', 'sf-select'] }],
    },
  },
]);
