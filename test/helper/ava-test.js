const Test = require('../../lib/test');
const ContextRef = require('../../lib/context-ref');

function ava(fn, contextRef) {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		registerUniqueTitle: () => true,
		metadata: {type: 'test', callback: false},
		title: 'test'
	});
}

ava.failing = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		registerUniqueTitle: () => true,
		metadata: {type: 'test', callback: false, failing: true},
		title: 'test.failing'
	});
};

ava.cb = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		registerUniqueTitle: () => true,
		metadata: {type: 'test', callback: true},
		title: 'test.cb'
	});
};

ava.cb.failing = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		registerUniqueTitle: () => true,
		metadata: {type: 'test', callback: true, failing: true},
		title: 'test.cb.failing'
	});
};

exports.ava = ava;
