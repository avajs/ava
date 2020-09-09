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
		'@typescript-eslint/no-var-requires': 'off'
	},
	overrides: [
		{
			files: '*.d.ts',
			rules: {
				'@typescript-eslint/member-ordering': 'off',
				'@typescript-eslint/method-signature-style': 'off',
				'@typescript-eslint/prefer-readonly-parameter-types': 'off',
				'@typescript-eslint/prefer-function-type': 'off',
				'@typescript-eslint/unified-signatures': 'off'
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
				'import/no-extraneous-dependencies': 'off'
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
