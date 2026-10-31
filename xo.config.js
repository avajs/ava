import pluginAva from 'eslint-plugin-ava';

// The AVA rules resolve the AVA config, however we have many fake AVA configs in the fixtures and so the rules must
// be disabled for those files. This sets up a rules config that does so, based on the recommended rules.
const disabledAvaRules = Object.fromEntries(pluginAva.configs.recommended.flatMap(({rules}) => Object.keys(rules).map(rule => [rule, 'off'])));

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	{
		ignores: [
			'**/fixtures/**/package.json',
			'examples/**/package.json',
			'media/**/package.json',
			'test-tap/fixture/**/package.json',
			'test/line-numbers/fixtures/line-numbers.js',
			'test-tap/fixture/snapshots/test-sourcemaps/build/**',
			'test-tap/fixture/report/edgecases/ast-syntax-error.js',
			'test-tap/fixture/**/*.ts',
			'test-types',
			'examples/typescript-*',
		],
	},
	{
		rules: {
			'@stylistic/curly-newline': 'off',
			'import-x/order': [
				'error',
				{
					alphabetize: {
						order: 'asc',
					},
					'newlines-between': 'always',
				},
			],
			'import-x/newline-after-import': 'error',
			'no-labels': 'off',
			'require-unicode-regexp': 'off',
			'unicorn/require-post-message-target-origin': 'off',
			'unicorn/prefer-event-target': 'off',
			'unicorn/prevent-abbreviations': 'off',
		},
	},
	{
		files: '**/*.d.*(c|m)ts',
		rules: {
			'@stylistic/indent': 'off',
			'@stylistic/operator-linebreak': 'off',
			'@stylistic/type-generic-spacing': 'off',
			'import-x/extensions': 'off',
			'n/file-extension-in-import': 'off',
		},
	},
	{
		files: ['examples/**', 'media/**'],
		rules: {
			...disabledAvaRules,
		},
	},
	{
		files: [
			'test/**/fixtures/**',
			'test-tap/fixture/**',
		],
		rules: {
			...disabledAvaRules,
			'@typescript-eslint/no-unsafe-type-assertion': 'off',
			'import-x/no-extraneous-dependencies': 'off',
			'n/no-extraneous-import': 'off',
			'unicorn/filename-case': 'off',
			'unicorn/no-empty-file': 'off',
			'unicorn/no-anonymous-default-export': 'off',
		},
	},
	{
		files: ['test/**', 'test-tap/**'],
		rules: {
			'node-test/no-import-test-files': 'off',
			'no-shadow': ['error', {allow: ['t']}],
			'regexp/no-super-linear-move': 'off',
			'regexp/no-super-linear-backtracking': 'off',
			'regexp/prefer-named-capture-group': 'off',
		},
	},
	{
		files: 'package.json',
		rules: {
			'package-json/prefer-shorthand': 'off',
			'package-json/prefer-side-effects-field': 'off',
			'package-json/require-types-in-exports': 'off',
			'package-json/require-default-condition': 'off',
			'package-json/dependency-version-range': 'off',
		},
	},
	{
		files: 'test-types/**',
		rules: {
			'ava/assertion-arguments': 'off',
			'ava/no-ignored-test-files': 'off',
			'ava/no-skip-assert': 'off',
			'ava/use-t': 'off',
		},
	},
];

export default xoConfig;
