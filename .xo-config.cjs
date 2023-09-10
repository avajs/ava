// XO's AVA plugin will use the checked out code to resolve AVA configuration,
// which causes all kinds of confusion when it finds our own ava.config.cjs file
// or other ava.config.* fixtures.
// Use the internal test flag to make XO behave like our own tests.
require('node:process').env.AVA_FAKE_SCM_ROOT = '.fake-root';

module.exports = {
	ignores: [
		'media/**',
		'test/config/fixtures/config-errors/test.js',
		'test/line-numbers/fixtures/line-numbers.js',
		'test-tap/fixture/snapshots/test-sourcemaps/build/**',
		'test-tap/fixture/report/edgecases/ast-syntax-error.cjs',
		'examples/typescript-*/**/*.ts',
	],
	rules: {
		'import/order': [
			'error',
			{
				alphabetize: {
					order: 'asc',
				},
				'newlines-between': 'always',
			},
		],
		'import/newline-after-import': 'error',
		'unicorn/require-post-message-target-origin': 'off',
	},
	overrides: [
		{
			files: '**/*.d.*(c|m)ts',
			rules: {
				'import/extensions': 'off',
			},
		},
		{
			files: 'examples/**',
			rules: {
				'ava/no-ignored-test-files': 'off',
				'ava/no-only-test': 'off',
				'unicorn/prefer-module': 'off',
			},
		},
		{
			files: [
				'test/**/fixtures/**',
				'test-tap/**fixture/**',
			],
			rules: {
				'unicorn/no-empty-file': 'off',
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
				'import/no-anonymous-default-export': 'off',
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
				'import/no-anonymous-default-export': 'off',
				'n/prefer-global/process': 'off',
				'unicorn/error-message': 'off',
			},
		},
	],
};
