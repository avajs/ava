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
	flag ||= name;

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

function getSkippedTarget(target) {
	let current = target;
	while (current) {
		if (current.skip) {
			return current.skip;
		}

		current = chainRegistry.get(current)?.prev;
	}

	return target;
}

function createConditionalChain(node, shouldSkip) {
	return new Proxy(node, {
		apply(target, thisArg, argumentsList) {
			return (shouldSkip ? getSkippedTarget(target) : target).apply(thisArg, argumentsList);
		},
		get(target, prop, receiver) {
			// Proxy invariant: non-configurable properties must return invariant-safe values.
			const descriptor = Object.getOwnPropertyDescriptor(target, prop);
			if (descriptor && !descriptor.configurable) {
				if ('value' in descriptor && !descriptor.writable) {
					return descriptor.value;
				}

				if ('get' in descriptor && descriptor.get === undefined) {
					return undefined;
				}
			}

			if (prop === 'skipIf' || prop === 'runIf') {
				return typeof target[prop] === 'function'
					? condition => createConditionalChain(target, shouldSkip || (prop === 'skipIf' ? condition : !condition))
					: undefined;
			}

			const value = Reflect.get(target, prop, receiver);
			if (chainRegistry.has(value)) {
				const {call, defaults} = chainRegistry.get(value);
				if (!call || (defaults.type === 'test' && !defaults.todo)) {
					return createConditionalChain(value, shouldSkip);
				}

				return value;
			}

			if (
				shouldSkip
				&& value === undefined
			) {
				return Reflect.get(getSkippedTarget(target), prop);
			}

			return value;
		},
	});
}

function addConditionalModifiers(node) {
	node.skipIf = condition => createConditionalChain(node, condition);
	node.runIf = condition => createConditionalChain(node, !condition);
}

function createHookChain(hook, isAfterHook) {
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

	return hook;
}

export default function createChain(fn, defaults, meta) {
	// Test chaining rules:
	// * `serial` must come at the start
	// * `only` and `skip` must come at the end
	// * `failing` must come at the end, but can be followed by `only` and `skip`
	// * `only` and `skip` cannot be chained together
	// * no repeating
	const root = startChain('test', fn, {...defaults, type: 'test'});
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

	for (const node of [root, root.serial, root.failing, root.serial.failing]) {
		addConditionalModifiers(node);
	}

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
	root.serial.todo = startChain('test.serial.todo', fn, {
		...defaults, serial: true, type: 'test', todo: true,
	});

	root.macro = options => {
		if (typeof options === 'function') {
			return Object.freeze({exec: options});
		}

		return Object.freeze({exec: options.exec, title: options.title});
	};

	root.meta = meta;

	// The ESM and CJS type definitions export the chain (`test()` function) as
	// the default. TypeScript's CJS output (when `esModuleInterop` is disabled)
	// assume `require('ava').default` is available. The same goes for `import ava
	// = require('ava')` syntax.
	//
	// Add `test.default` to make this work. Use a proxy to avoid
	// `test.default.default` chains.
	Object.defineProperty(root, 'default', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: new Proxy(root, {
			apply(target, thisArg, argumentsList) {
				target.apply(thisArg, argumentsList);
			},
			get(target, prop) {
				if (prop === 'default') {
					throw new TypeError('Cannot access default.default');
				}

				return target[prop];
			},
		}),
	});

	return root;
}
