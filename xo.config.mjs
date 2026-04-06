import pluginAva from './node_modules/xo/node_modules/eslint-plugin-ava/index.js';

// The AVA rules resolve the AVA config, however we have many fake AVA configs in the fixtures and so the rules must
// be disabled for those files. This sets up a rules config that does so, based on the recommended rules.
const disabledAvaRules = Object.fromEntries(pluginAva.configs.recommended.flatMap(({rules}) => Object.keys(rules).map(rule => [rule, 'off'])));

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: [
			'test/line-numbers/fixtures/line-numbers.js',
			'test-tap/fixture/snapshots/test-sourcemaps/build/**',
			'test-tap/fixture/report/edgecases/ast-syntax-error.cjs',
			'test-tap/fixture/**/*.ts',
			'test-types',
			'examples/typescript-*/**/*.ts',
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
			'unicorn/no-empty-file': 'off',
			'unicorn/no-anonymous-default-export': 'off',
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
	{
		// TODO: Update tests.
		files: 'test/**',
		rules: {
			'import-x/no-anonymous-default-export': 'off',
			'n/prefer-global/process': 'off',
		},
	},
	{
		files: 'test/**/fixtures/**',
		rules: {
			'n/file-extension-in-import': 'off',
		},
	},
	{
		// TODO: Update tests.
		files: 'test/snapshot-*/fixtures/**',
		rules: {
			'unicorn/prefer-module': 'off',
		},
	},
	{
		// TODO: Update tests.
		files: 'test-tap/**',
		rules: {
			'import-x/no-anonymous-default-export': 'off',
			'max-lines': 'off',
			'n/prefer-global/process': 'off',
			// 'promise/prefer-await-to-then': 'off',
			'unicorn/error-message': 'off',
		},
	},
];

export default xoConfig;
