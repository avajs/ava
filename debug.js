#!/usr/bin/env node
'use strict';

var onExit = require('signal-exit');
var serializeValue = require('./lib/serialize-value');
var chalk = require('chalk');

process.send = function (data) {
	console.log(chalk.magenta(JSON.stringify(serializeValue(data), null, 4)));
};

onExit(function () {
	process.emit('ava-cleanup', true);
});

require('./lib/babel');
