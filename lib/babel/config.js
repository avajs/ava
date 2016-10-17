'use strict';
var chalk = require('chalk');
var figures = require('figures');
var objectAssign = require('object-assign');
var semver = require('semver');

var colors = require('../colors');

var ESPOWER = require.resolve('./plugin-espower');
var REWRITE_RUNTIME = require.resolve('./plugin-rewrite-runtime');

var DEFAULT_PRESETS = (function () {
	var esPreset = semver.satisfies(process.version, '>=4') ?
		'babel-preset-es2015-node4' :
		'babel-preset-es2015';

	return [
		'babel-preset-stage-2',
		esPreset
	];
})();

var REQUIRED_PLUGINS = [
	'babel-plugin-ava-throws-helper',
	REWRITE_RUNTIME,
	'babel-plugin-transform-runtime'
];

function validate(conf) {
	if (conf === undefined || conf === null) {
		conf = 'default';
	}

	// check for valid babel config shortcuts (can be either "default" or "inherit")
	var isValidShortcut = conf === 'default' || conf === 'inherit';

	if (!conf || (typeof conf === 'string' && !isValidShortcut)) {
		var message = colors.error(figures.cross);
		message += ' Unexpected Babel configuration for AVA. ';
		message += 'See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';

		throw new Error(message);
	}

	return conf;
}
exports.validate = validate;

function resolve(plugin) {
	return require.resolve(plugin);
}

function build(conf, usePowerAssert) {
	conf = validate(conf);

	var options;

	if (conf === 'default') {
		options = {
			babelrc: false,
			presets: DEFAULT_PRESETS.map(resolve)
		};
	} else if (conf === 'inherit') {
		options = {
			babelrc: true
		};
	} else {
		options = {
			babelrc: false
		};

		objectAssign(options, conf);
	}

	options.plugins = (options.plugins || [])
		.concat(usePowerAssert ? [ESPOWER] : [])
		.concat(REQUIRED_PLUGINS.map(resolve));

	return options;
}
exports.build = build;

exports.pluginPackages = DEFAULT_PRESETS
	.concat(
		REQUIRED_PLUGINS.filter(function (plugin) {
			return plugin !== REWRITE_RUNTIME;
		})
	)
	// Dependency of ESPOWER
	.concat(['babel-plugin-espower'])
	// Dependency of REWRITE_RUNTIME
	.concat(['babel-plugin-detective'])
	.map(function (plugin) {
		return require.resolve(plugin + '/package.json');
	});
