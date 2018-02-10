'use strict';
const chainRegistry = new WeakMap();

function startChain(name, call, defaults) {
	const fn = function () {
		call(Object.assign({}, defaults), Array.from(arguments));
	};
	Object.defineProperty(fn, 'name', {value: name});
	chainRegistry.set(fn, {call, defaults, fullName: name});
	return fn;
}

function extendChain(prev, name, flag) {
	if (!flag) {
		flag = name;
	}

	const fn = function () {
		callWithFlag(prev, flag, Array.from(arguments));
	};
	const fullName = `${chainRegistry.get(prev).fullName}.${name}`;
	Object.defineProperty(fn, 'name', {value: fullName});
	prev[name] = fn;

	chainRegistry.set(fn, {flag, fullName, prev});
	return fn;
}

function callWithFlag(prev, flag, args) {
	const combinedFlags = {[flag]: true};
	do {
		const step = chainRegistry.get(prev);
		if (step.call) {
			step.call(Object.assign({}, step.defaults, combinedFlags), args);
			prev = null;
		} else {
			combinedFlags[step.flag] = true;
			prev = step.prev;
		}
	} while (prev);
}

function createHookChain(hook, isAfterHook) {
	// Hook chaining rules:
	// * `always` comes immediately after "after hooks"
	// * `skip` must come at the end
	// * no `only`
	// * no repeating
	extendChain(hook, 'cb', 'callback');
	extendChain(hook, 'skip', 'skipped');
	extendChain(hook.cb, 'skip', 'skipped');
	if (isAfterHook) {
		extendChain(hook, 'always');
		extendChain(hook.always, 'cb', 'callback');
		extendChain(hook.always, 'skip', 'skipped');
		extendChain(hook.always.cb, 'skip', 'skipped');
	}
	return hook;
}

function createChain(fn, defaults) {
	// Test chaining rules:
	// * `serial` must come at the start
	// * `only` and `skip` must come at the end
	// * `failing` must come at the end, but can be followed by `only` and `skip`
	// * `only` and `skip` cannot be chained together
	// * no repeating
	const root = startChain('test', fn, Object.assign({}, defaults, {type: 'test'}));
	extendChain(root, 'cb', 'callback');
	extendChain(root, 'failing');
	extendChain(root, 'only', 'exclusive');
	extendChain(root, 'serial');
	extendChain(root, 'skip', 'skipped');
	extendChain(root.cb, 'failing');
	extendChain(root.cb, 'only', 'exclusive');
	extendChain(root.cb, 'skip', 'skipped');
	extendChain(root.cb.failing, 'only', 'exclusive');
	extendChain(root.cb.failing, 'skip', 'skipped');
	extendChain(root.failing, 'only', 'exclusive');
	extendChain(root.failing, 'skip', 'skipped');
	extendChain(root.serial, 'cb', 'callback');
	extendChain(root.serial, 'failing');
	extendChain(root.serial, 'only', 'exclusive');
	extendChain(root.serial, 'skip', 'skipped');
	extendChain(root.serial.cb, 'failing');
	extendChain(root.serial.cb, 'only', 'exclusive');
	extendChain(root.serial.cb, 'skip', 'skipped');
	extendChain(root.serial.cb.failing, 'only', 'exclusive');
	extendChain(root.serial.cb.failing, 'skip', 'skipped');

	root.after = createHookChain(startChain('test.after', fn, Object.assign({}, defaults, {type: 'after'})), true);
	root.afterEach = createHookChain(startChain('test.afterEach', fn, Object.assign({}, defaults, {type: 'afterEach'})), true);
	root.before = createHookChain(startChain('test.before', fn, Object.assign({}, defaults, {type: 'before'})), false);
	root.beforeEach = createHookChain(startChain('test.beforeEach', fn, Object.assign({}, defaults, {type: 'beforeEach'})), false);

	root.serial.after = createHookChain(startChain('test.after', fn, Object.assign({}, defaults, {serial: true, type: 'after'})), true);
	root.serial.afterEach = createHookChain(startChain('test.afterEach', fn, Object.assign({}, defaults, {serial: true, type: 'afterEach'})), true);
	root.serial.before = createHookChain(startChain('test.before', fn, Object.assign({}, defaults, {serial: true, type: 'before'})), false);
	root.serial.beforeEach = createHookChain(startChain('test.beforeEach', fn, Object.assign({}, defaults, {serial: true, type: 'beforeEach'})), false);

	// "todo" tests cannot be chained. Allow todo tests to be flagged as needing
	// to be serial.
	root.todo = startChain('test.todo', fn, Object.assign({}, defaults, {type: 'test', todo: true}));
	root.serial.todo = startChain('test.serial.todo', fn, Object.assign({}, defaults, {serial: true, type: 'test', todo: true}));

	return root;
}
module.exports = createChain;
