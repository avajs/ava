module.exports = {
	ignores: [
		'media/**',
		'test/config/fixtures/config-errors/test.js',
		'test-tap/fixture/ava-paths/target/test.js',
		'test-tap/fixture/{source-map-initial,syntax-error}.js',
		'test-tap/fixture/snapshots/test-sourcemaps/build/**',
		'test-tap/fixture/power-assert.js',
		'test-tap/fixture/report/edgecases/ast-syntax-error.js'
	],
	rules: {
		'import/no-anonymous-default-export': 'off',
		'import/no-unresolved': ['error', {commonjs: true}],
		'no-use-extend-native/no-use-extend-native': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'ava/no-statement-after-end': 'off'
	},
	overrides: [
		{
			files: 'index.d.ts',
			rules: {
				'@typescript-eslint/member-ordering': 'off',
				'@typescript-eslint/method-signature-style': 'off',
				'@typescript-eslint/prefer-readonly-parameter-types': 'off',
				'@typescript-eslint/prefer-function-type': 'off',
				'@typescript-eslint/unified-signatures': 'off'
			}
		},
		{
			files: ['lib/plugin-support/shared-worker-loader.js', 'lib/plugin-support/shared-workers.js'],
			// TODO [engine:node@>=12]: Enable when targeting Node.js 12.
			rules: {
				'import/no-unresolved': 'off',
				'node/no-unsupported-features/node-builtins': 'off'
			}
		},
		{
			files: 'test-{d,tap}/**/*.ts',
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/no-empty-function': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/prefer-readonly-parameter-types': 'off',
				'no-unused-vars': 'off'
			}
		},
		{
			files: 'test-tap/**/*.js',
			rules: {
				'promise/prefer-await-to-then': 'off'
			}
		},
		{
			files: ['test-tap/fixture/**', 'test/**/fixtures/**'],
			rules: {
				'import/no-extraneous-dependencies': 'off',
				'import/no-unresolved': 'off'
			}
		}
	],
	settings: {
		'import/resolver': {
			node: {
				extensions: ['.js']
			}
		}
	}
};
