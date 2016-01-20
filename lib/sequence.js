'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');

function Sequence(tests) {
	if (!this instanceof Sequence) {
		throw new Error('Sequence must be called with new');
	}
	EventEmitter.call(this);
	this.tests = tests;
	this.context = {};
}

util.inherits(Sequence, EventEmitter);
module.exports = Sequence;

Sequence.prototype.run = function() {
	var self = this;

	return Promise.each(this.tests, function (test) {
		Object.defineProperty(test, 'context', {
			get: function () {
				return self.context;
			},
			set: function (val) {
				self.context = val;
			}
		});

		return test.run().finally(function () {
			self.emit('test', test);
		});
	}).catch(function (e){});
};
