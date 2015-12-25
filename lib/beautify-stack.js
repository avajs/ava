'use strict';

function beautifyStack(stack) {
	var re = /(?:^(?! {4}at\b).{6})|(?:\((?:[A-Z]:)?(?:[\\\/](?:(?!node_modules[\\\/]ava[\\\/])[^:\\\/])+)+:\d+:\d+\))/;
	var found = false;

	return stack.split('\n').filter(function (line) {
		var relevant = re.test(line);
		found = found || relevant;
		return !found || relevant;
	}).join('\n');
}

module.exports = beautifyStack;
