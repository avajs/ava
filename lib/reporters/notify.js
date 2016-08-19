'use strict';
var path = require('path');
var autoBind = require('auto-bind');
var plur = require('plur');
var assign = require('object-assign');
var stripAnsi = require('strip-ansi');

function Notifier(notifier) {
	if (!(this instanceof Notifier)) {
		throw new TypeError('Class constructor Notifier cannot be invoked without \'new\'');
	}

	this._instance = notifier;
	this._defaults = {
		title: 'AVA',
		icon: path.join(__dirname, '../../media/logo-square.png'),
		type: 'info',
		message: ''
	};

	autoBind(this);
}

module.exports = Notifier;

Notifier.prototype.test = function () {
	return null;
};

Notifier.prototype.unhandledError = function (err) {
	if (err.name === 'AvaError') {
		return assign({}, this._defaults, {
			type: 'error',
			message: 'There was some problem: ' + err.message
		});
	}

	return assign({}, this._defaults, {
		type: 'error',
		message: 'There was some problem.'
	});
};

Notifier.prototype.finish = function (runStatus) {
	var firstError = runStatus.errors[0];
	var failCount = runStatus.failCount;
	var type = '';
	var message = '';

	if (failCount === 0) {
		type = 'info';
		message = runStatus.passCount + ' test passed.';
	}

	if (failCount > 0) {
		type = 'warn';
		failCount--;
		message = '"' + stripAnsi(firstError.title) + '" and ' + failCount + ' other ' + plur('test', failCount) + ' failed.';
	}

	return assign({}, this._defaults, {
		type: type,
		message: message
	});
};

Notifier.prototype.write = function (notification) {
	if (notification === null || typeof notification === 'string') {
		return;
	}

	var message = notification.message;

	switch (notification.type) {
		case 'error':
			message = '❌ ' + message;
			break;
		case 'warn':
			message = '⚠️ ' + message;
			break;
		default:
			message = '✅ ' + message;
	}
	notification.message = message;
	this._instance.notify(notification);
};
