import {test} from 'tap';

import createChain from '../lib/create-chain.js';

function createTestChain() {
	const calls = [];
	const chain = createChain((metadata, arguments_) => {
		calls.push({metadata, arguments_});
	}, {}, {});

	return {calls, chain};
}

test('skipIf() keeps chaining methods available when condition is true', t => {
	const {calls, chain} = createTestChain();

	t.doesNotThrow(() => {
		chain.skipIf(true).serial('title', () => {});
	});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.serial, true);
	t.equal(calls[0].metadata.skipped, true);
	t.end();
});

test('skipIf() skips terminal .only chains', t => {
	const {calls, chain} = createTestChain();

	t.doesNotThrow(() => {
		chain.skipIf(true).only('title', () => {});
	});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.skipped, true);
	t.equal(calls[0].metadata.exclusive, undefined);
	t.end();
});

test('runIf() skips terminal .serial.only chains when condition is false', t => {
	const {calls, chain} = createTestChain();

	t.doesNotThrow(() => {
		chain.runIf(false).serial.only('title', () => {});
	});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.serial, true);
	t.equal(calls[0].metadata.skipped, true);
	t.equal(calls[0].metadata.exclusive, undefined);
	t.end();
});

test('skipIf() does not add conditional modifiers to terminal .only chains', t => {
	const {chain} = createTestChain();

	t.equal(chain.skipIf(false).only.skipIf, undefined);
	t.equal(chain.skipIf(false).only.runIf, undefined);
	t.end();
});

test('skipIf() keeps .todo chaining available', t => {
	const {calls, chain} = createTestChain();

	t.doesNotThrow(() => {
		chain.skipIf(true).todo('title');
		chain.skipIf(false).todo('title');
	});

	t.equal(calls.length, 2);
	t.equal(calls[0].metadata.todo, true);
	t.equal(calls[1].metadata.todo, true);
	t.end();
});

test('skipIf(false) and runIf(true) behave as no-op for todo chains', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).todo('title');
	chain.runIf(true).todo('title');
	chain.serial.skipIf(false).todo('title');
	chain.serial.runIf(true).todo('title');

	t.equal(calls.length, 4);
	t.equal(calls[0].metadata.skipped, undefined);
	t.equal(calls[1].metadata.skipped, undefined);
	t.equal(calls[2].metadata.skipped, undefined);
	t.equal(calls[3].metadata.skipped, undefined);
	t.end();
});

test('serial.skipIf() skips with serial flag preserved', t => {
	const {calls, chain} = createTestChain();

	chain.serial.skipIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.serial, true);
	t.equal(calls[0].metadata.skipped, true);
	t.end();
});

test('failing.skipIf() skips with failing flag preserved', t => {
	const {calls, chain} = createTestChain();

	chain.failing.skipIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.failing, true);
	t.equal(calls[0].metadata.skipped, true);
	t.end();
});

test('serial.failing.skipIf() skips with serial and failing flags preserved', t => {
	const {calls, chain} = createTestChain();

	chain.serial.failing.skipIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.serial, true);
	t.equal(calls[0].metadata.failing, true);
	t.equal(calls[0].metadata.skipped, true);
	t.end();
});

test('skipIf(true).todo() does not set skipped', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).todo('title');

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.todo, true);
	t.equal(calls[0].metadata.skipped, undefined);
	t.end();
});

test('conditional chains preserve hook access when skipped', t => {
	const {calls, chain} = createTestChain();

	t.doesNotThrow(() => {
		chain.skipIf(true).beforeEach('title', () => {});
		chain.runIf(false).afterEach('title', () => {});
	});

	t.equal(calls.length, 2);
	t.equal(calls[0].metadata.type, 'beforeEach');
	t.equal(calls[0].metadata.skipped, undefined);
	t.equal(calls[1].metadata.type, 'afterEach');
	t.equal(calls[1].metadata.skipped, undefined);
	t.end();
});

test('conditional chains preserve root macro and meta access when skipped', t => {
	const {chain} = createTestChain();
	const execFunction = () => {};
	const titleFunction = provided => provided;
	const objectMacro = {exec: execFunction, title: titleFunction};
	const skippedFunctionMacro = chain.skipIf(true).macro(execFunction);
	const runIfFunctionMacro = chain.runIf(false).macro(execFunction);
	const skippedObjectMacro = chain.skipIf(true).macro(objectMacro);
	const runIfObjectMacro = chain.runIf(false).macro(objectMacro);

	t.type(chain.skipIf(true).macro, 'function');
	t.type(chain.runIf(false).macro, 'function');
	t.equal(skippedFunctionMacro.exec, execFunction);
	t.equal(runIfFunctionMacro.exec, execFunction);
	t.equal(skippedObjectMacro.exec, execFunction);
	t.equal(skippedObjectMacro.title, titleFunction);
	t.equal(runIfObjectMacro.exec, execFunction);
	t.equal(runIfObjectMacro.title, titleFunction);
	t.equal(chain.skipIf(true).meta, chain.meta);
	t.equal(chain.runIf(false).meta, chain.meta);
	t.end();
});

test('skip state is irreversible: runIf(true) cannot undo a prior skipIf(true)', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).serial.runIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.serial, true);
	t.equal(calls[0].metadata.skipped, true);
	t.end();
});

test('accessing .default on a skipped proxy does not throw (proxy invariant)', t => {
	const {chain} = createTestChain();

	t.doesNotThrow(() => {
		// eslint-disable-next-line no-unused-expressions
		chain.skipIf(true).default;
	});

	t.end();
});

test('accessing non-configurable accessor without getter on conditional chains returns undefined (proxy invariant)', t => {
	const {chain} = createTestChain();

	Object.defineProperty(chain, 'noGetter', {
		configurable: false,
		get: undefined,
		set() {},
	});

	t.equal(chain.skipIf(true).noGetter, undefined);
	t.equal(chain.skipIf(false).noGetter, undefined);
	t.equal(chain.runIf(false).noGetter, undefined);
	t.equal(chain.runIf(true).noGetter, undefined);
	t.end();
});

test('skipIf().skipIf() skips if either condition is true', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).skipIf(false)('title', () => {});
	chain.skipIf(false).skipIf(true)('title', () => {});

	t.equal(calls.length, 2);
	t.equal(calls[0].metadata.skipped, true);
	t.equal(calls[1].metadata.skipped, true);
	t.end();
});

test('skipIf().skipIf() does not skip if both conditions are false', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).skipIf(false)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.skipped, undefined);
	t.end();
});

test('runIf().runIf() skips if either condition is false', t => {
	const {calls, chain} = createTestChain();

	chain.runIf(true).runIf(false)('title', () => {});
	chain.runIf(false).runIf(true)('title', () => {});

	t.equal(calls.length, 2);
	t.equal(calls[0].metadata.skipped, true);
	t.equal(calls[1].metadata.skipped, true);
	t.end();
});

test('runIf().runIf() does not skip if both conditions are true', t => {
	const {calls, chain} = createTestChain();

	chain.runIf(true).runIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.skipped, undefined);
	t.end();
});

test('skipIf().runIf() skips if skipIf condition is true or runIf condition is false', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).runIf(true)('title', () => {}); // `skipIf` wins
	chain.skipIf(false).runIf(false)('title', () => {}); // `runIf` wins

	t.equal(calls.length, 2);
	t.equal(calls[0].metadata.skipped, true);
	t.equal(calls[1].metadata.skipped, true);
	t.end();
});

test('skipIf(false).runIf(true) does not skip', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).runIf(true)('title', () => {});

	t.equal(calls.length, 1);
	t.equal(calls[0].metadata.skipped, undefined);
	t.end();
});
