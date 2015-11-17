'use strict';
const test = require('../../');
var Promise = require('pinkie');

test('pinkie', function (t) {
	return Promise.resolve().then(function () {
		throw Error('pinkie error');
	}).catch(function (err) {
		t.is(err.message, 'pinkie error');
	}).then(function () {
		throw Error('pinkie error2');
	}).catch(function () {
		throw Error('pinkie error3');
	}).catch(function (err) {
		t.is(err.message, 'pinkie error3');
	}).then(function () {
		t.pass();
	});
});
