const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const {defineConfig} = require('rollup');
const autoExternal = require('rollup-plugin-auto-external');
const {default: dts} = require('rollup-plugin-dts');

const pkg = require('./package.json');

const getPlugins = () => [autoExternal(), nodeResolve(), commonjs(), json()];

module.exports = defineConfig([
	{
		input: './lib/worker/main.cjs',

		output: [
			{
				file: pkg.exports['.'].import.default,
				format: 'module',
			},
			{
				file: pkg.exports['.'].require.default,
				format: 'commonjs',
			},
		],

		plugins: getPlugins(),
	},
	{
		input: './lib/worker/plugin.cjs',

		output: [
			{
				file: pkg.exports['./plugin'].import.default,
				format: 'module',
			},
			{
				file: pkg.exports['./plugin'].require.default,
				format: 'commonjs',
			},
		],

		plugins: getPlugins(),
	},
	{
		input: './entrypoints/eslint-plugin-helper.cjs',

		output: [
			{
				file: pkg.exports['./eslint-plugin-helper'],
				format: 'commonjs',
			},
		],

		plugins: getPlugins(),
	},
	{
		input: './entrypoints/cli.mjs',

		output: [
			{
				file: pkg.bin.ava,
				format: 'module',
				banner: '#!/usr/bin/env node',
			},
		],

		plugins: getPlugins(),
	},
	{
		input: './types/main.d.ts',

		output: [
			{
				file: pkg.exports['.'].import.types,
			},
			{
				file: pkg.exports['.'].require.types,
			},
		],

		plugins: [dts()],
	},
	{
		input: './types/plugin.d.ts',

		output: [
			{
				file: pkg.exports['./plugin'].import.types,
			},
			{
				file: pkg.exports['./plugin'].require.types,
			},
		],

		plugins: [dts()],
	},
]);
