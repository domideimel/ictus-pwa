// @ts-check
import js from '@eslint/js';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/**
 * The strictest presets: typescript-eslint strict + stylistic (type-checked) and every angular-eslint
 * rule. Rules switched off below contradict the project's own conventions (see CLAUDE.md), not strictness.
 */
export default tseslint.config(
  { ignores: ['dist/', 'coverage/', '.angular/', 'eslint.config.mjs'] },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsAll,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // Prefers `x!` over `x as T`, which conflicts with no-non-null-assertion (and its autofix drops types).
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      // Numbers read naturally in messages and labels; everything else must be a string.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Components are decorated classes, even when the template does all the work.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      // Angular's style guide (v20+) names classes without Component / Directive suffixes.
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
      // Every template lives in its own .html file (see CLAUDE.md).
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0 }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateAll],
    rules: {
      // Signals are read by calling them in templates.
      '@angular-eslint/template/no-call-expression': 'off',
      // The app is English only.
      '@angular-eslint/template/i18n': 'off',
      // Each @case of a @switch counts as a branch; the icon set alone would exceed any limit.
      '@angular-eslint/template/cyclomatic-complexity': 'off',
      // [style.x] and [class] bindings are the project's way to style dynamically.
      '@angular-eslint/template/no-inline-styles': [
        'error',
        { allowBindToStyle: true, allowNgStyle: false },
      ],
      '@angular-eslint/template/no-duplicate-attributes': [
        'error',
        { allowStylePrecedenceDuplicates: true },
      ],
    },
  },
  {
    files: ['src/**/*.spec.ts', 'src/testing/**/*.ts', 'src/test-setup.ts', 'e2e/**/*.ts'],
    rules: {
      // Tests assert on elements they just rendered.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Vitest's asymmetric matchers (expect.closeTo, expect.objectContaining) are typed as any.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Small setup helpers return inferred fixture bundles.
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Test hosts are created directly, never by selector.
      '@angular-eslint/use-component-selector': 'off',
      // Test hosts are the one place an inline template is clearer than a file.
      '@angular-eslint/component-max-inline-declarations': 'off',
    },
  },
);
