import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {defineConfig} from 'rollup';
import autoExternal from 'rollup-plugin-auto-external';
import dts from 'rollup-plugin-dts';

import pkg from './package.json' assert { "type": "json" };

const getPlugins = () => [autoExternal(), nodeResolve(), commonjs(), json()];

export default defineConfig([
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
