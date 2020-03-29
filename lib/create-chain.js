'use strict';
const chainRegistry = new WeakMap();

function startChain(name, call, defaults) {
	const fn = (...args) => {
		call({...defaults}, args);
	};

	Object.defineProperty(fn, 'name', {value: name});
	chainRegistry.set(fn, {call, defaults, fullName: name});
	return fn;
}

function extendChain(previous, name, flag) {
	if (!flag) {
		flag = name;
	}

	const fn = (...args) => {
		callWithFlag(previous, flag, args);
	};

	const fullName = `${chainRegistry.get(previous).fullName}.${name}`;
	Object.defineProperty(fn, 'name', {value: fullName});
	previous[name] = fn;

	chainRegistry.set(fn, {flag, fullName, prev: previous});
	return fn;
}

function callWithFlag(previous, flag, args) {
	const combinedFlags = {[flag]: true};
	do {
		const step = chainRegistry.get(previous);
		if (step.call) {
			step.call({...step.defaults, ...combinedFlags}, args);
			previous = null;
		} else {
			combinedFlags[step.flag] = true;
			previous = step.prev;
		}
	} while (previous);
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

function createChain(fn, defaults, meta) {
	// Test chaining rules:
	// * `serial` must come at the start
	// * `only` and `skip` must come at the end
	// * `failing` must come at the end, but can be followed by `only` and `skip`
	// * `only` and `skip` cannot be chained together
	// * no repeating
	const root = startChain('test', fn, {...defaults, type: 'test'});
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
	extendChain(root.serial.failing, 'only', 'exclusive');
	extendChain(root.serial.failing, 'skip', 'skipped');

	root.after = createHookChain(startChain('test.after', fn, {...defaults, type: 'after'}), true);
	root.afterEach = createHookChain(startChain('test.afterEach', fn, {...defaults, type: 'afterEach'}), true);
	root.before = createHookChain(startChain('test.before', fn, {...defaults, type: 'before'}), false);
	root.beforeEach = createHookChain(startChain('test.beforeEach', fn, {...defaults, type: 'beforeEach'}), false);

	root.serial.after = createHookChain(startChain('test.after', fn, {...defaults, serial: true, type: 'after'}), true);
	root.serial.afterEach = createHookChain(startChain('test.afterEach', fn, {...defaults, serial: true, type: 'afterEach'}), true);
	root.serial.before = createHookChain(startChain('test.before', fn, {...defaults, serial: true, type: 'before'}), false);
	root.serial.beforeEach = createHookChain(startChain('test.beforeEach', fn, {...defaults, serial: true, type: 'beforeEach'}), false);

	// "todo" tests cannot be chained. Allow todo tests to be flagged as needing
	// to be serial.
	root.todo = startChain('test.todo', fn, {...defaults, type: 'test', todo: true});
	root.serial.todo = startChain('test.serial.todo', fn, {...defaults, serial: true, type: 'test', todo: true});

	root.meta = meta;

	return root;
}

module.exports = createChain;
