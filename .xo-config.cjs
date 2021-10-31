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
			files: [
				'index.d.ts',
				'types/*.d.ts',
			],
			rules: {
				'import/extensions': 'off',
			},
		},
		{
			files: 'plugin.d.ts',
			rules: {
				'node/prefer-global/url': 'off',
			},
		},
		{
			files: '{test,test-{d,tap}}/**/*.ts',
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/no-empty-function': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/prefer-readonly-parameter-types': 'off',
			},
		},
		{
			files: '{test,test-{d,tap}}/**',
			rules: {
				'import/no-anonymous-default-export': 'off',
				'node/prefer-global/buffer': 'off',
				'node/prefer-global/process': 'off',
			},
		},
		{
			files: 'test-tap/**',
			rules: {
				'promise/prefer-await-to-then': 'off',
				'unicorn/error-message': 'off',
				'unicorn/no-array-reduce': 'off',
				'unicorn/prevent-abbreviations': 'off',
			},
		},
		{
			files: 'test/macros/fixtures/macros.js',
			rules: {
				'ava/no-identical-title': 'off',
			},
		},
		{
			files: [
				'examples/**',
				'test/snapshot-*/fixtures/**',
			],
			rules: {
				'unicorn/prefer-module': 'off',
			},
		},
		{
			files: 'examples/**',
			rules: {
				'ava/no-only-test': 'off',
			},
		},
	],
};
