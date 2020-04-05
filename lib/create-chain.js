'use strict';
const chainRegistry = new WeakMap();

function startChain(name, declare, annotations) {
	const fn = (...args) => {
		declare(annotations, args);
	};

	Object.defineProperty(fn, 'name', {value: name});
	chainRegistry.set(fn, {annotations, declare, fullName: name});
	return fn;
}

function extendChain(previous, name, flag = name) {
	const fn = (...args) => {
		declareWithFlag(previous, flag, args);
	};

	const fullName = `${chainRegistry.get(previous).fullName}.${name}`;
	Object.defineProperty(fn, 'name', {value: fullName});
	previous[name] = fn;

	chainRegistry.set(fn, {flag, fullName, previous});
	return fn;
}

function declareWithFlag(previous, flag, args) {
	const combinedFlags = {[flag]: true};
	do {
		const step = chainRegistry.get(previous);
		if (step.flag) {
			combinedFlags[step.flag] = true;
			previous = step.previous;
		} else {
			step.declare({...step.annotations, ...combinedFlags}, args);
			break;
		}
	} while (previous);
}

function createHookChain({allowCallbacks, isAfterHook = false}, hook) {
	// Hook chaining rules:
	// * `always` comes immediately after "after hooks"
	// * `skip` must come at the end
	// * no `only`
	// * no repeating
	extendChain(hook, 'skip', 'skipped');
	if (isAfterHook) {
		extendChain(hook, 'always');
		extendChain(hook.always, 'skip', 'skipped');
	}

	if (allowCallbacks) {
		extendChain(hook, 'cb', 'callback');
		extendChain(hook.cb, 'skip', 'skipped');
		if (isAfterHook) {
			extendChain(hook.always, 'cb', 'callback');
			extendChain(hook.always.cb, 'skip', 'skipped');
		}
	}

	return hook;
}

function createChain({
	allowCallbacks = true,
	allowExperimentalMacros = false,
	allowImplementationTitleFns = true,
	allowMultipleImplementations = true,
	annotations,
	declare: declareWithOptions,
	meta
}) {
	const options = {
		allowCallbacks,
		allowExperimentalMacros,
		allowImplementationTitleFns,
		allowMultipleImplementations
	};

	const declare = (declaredAnnotations, args) => {
		declareWithOptions({
			annotations: {...annotations, ...declaredAnnotations},
			args,
			options
		});
	};

	const macro = definition => {
		if (typeof definition === 'function') {
			return {exec: definition};
		}

		if (typeof definition === 'object' && definition !== null) {
			const {exec, title} = definition;
			if (typeof exec !== 'function') {
				throw new TypeError('Macro object must have an exec() function');
			}

			if (title !== undefined && typeof title !== 'function') {
				throw new Error('’title’ property of macro object must be a function');
			}

			return {exec, title};
		}
	};

	// Test chaining rules:
	// * `serial` must come at the start
	// * `only` and `skip` must come at the end
	// * `failing` must come at the end, but can be followed by `only` and `skip`
	// * `only` and `skip` cannot be chained together
	// * no repeating
	const root = startChain('test', declare, {type: 'test'});
	extendChain(root, 'failing');
	extendChain(root, 'only', 'exclusive');
	extendChain(root, 'serial');
	extendChain(root, 'skip', 'skipped');
	extendChain(root.failing, 'only', 'exclusive');
	extendChain(root.failing, 'skip', 'skipped');
	extendChain(root.serial, 'failing');
	extendChain(root.serial, 'only', 'exclusive');
	extendChain(root.serial, 'skip', 'skipped');
	extendChain(root.serial.failing, 'only', 'exclusive');
	extendChain(root.serial.failing, 'skip', 'skipped');

	if (allowCallbacks) {
		extendChain(root, 'cb', 'callback');
		extendChain(root.cb, 'failing');
		extendChain(root.cb, 'only', 'exclusive');
		extendChain(root.cb, 'skip', 'skipped');
		extendChain(root.cb.failing, 'only', 'exclusive');
		extendChain(root.cb.failing, 'skip', 'skipped');
		extendChain(root.serial, 'cb', 'callback');
		extendChain(root.serial.cb, 'failing');
		extendChain(root.serial.cb, 'only', 'exclusive');
		extendChain(root.serial.cb, 'skip', 'skipped');
		extendChain(root.serial.cb.failing, 'only', 'exclusive');
		extendChain(root.serial.cb.failing, 'skip', 'skipped');
	}

	root.after = createHookChain({allowCallbacks, isAfterHook: true}, startChain('test.after', declare, {type: 'after'}));
	root.afterEach = createHookChain({allowCallbacks, isAfterHook: true}, startChain('test.afterEach', declare, {type: 'afterEach'}));
	root.before = createHookChain({allowCallbacks}, startChain('test.before', declare, {type: 'before'}));
	root.beforeEach = createHookChain({allowCallbacks}, startChain('test.beforeEach', declare, {type: 'beforeEach'}));

	root.serial.after = createHookChain({allowCallbacks, isAfterHook: true}, startChain('test.after', declare, {serial: true, type: 'after'}));
	root.serial.afterEach = createHookChain({allowCallbacks, isAfterHook: true}, startChain('test.afterEach', declare, {serial: true, type: 'afterEach'}));
	root.serial.before = createHookChain({allowCallbacks}, startChain('test.before', declare, {serial: true, type: 'before'}));
	root.serial.beforeEach = createHookChain({allowCallbacks}, startChain('test.beforeEach', declare, {serial: true, type: 'beforeEach'}));
	root.serial.macro = macro;

	// "todo" tests cannot be chained. Allow todo tests to be flagged as needing
	// to be serial.
	root.todo = startChain('test.todo', declare, {type: 'test', todo: true});
	root.serial.todo = startChain('test.serial.todo', declare, {serial: true, type: 'test', todo: true});

	root.macro = macro;
	root.meta = meta;

	return root;
}

module.exports = createChain;
