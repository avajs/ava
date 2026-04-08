import test from '@ava/test';

import createChain from '../../lib/create-chain.js';

function createTestChain() {
	const calls = [];
	const chain = createChain((metadata, arguments_) => {
		calls.push({metadata, arguments_});
	}, {}, {});

	return {calls, chain};
}

test('skipIf() keeps chaining methods available when condition is true', t => {
	const {calls, chain} = createTestChain();

	t.notThrows(() => {
		chain.skipIf(true).serial('title', () => {});
	});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.serial, true);
	t.is(calls[0].metadata.skipped, true);
});

test('skipIf() skips terminal .only chains', t => {
	const {calls, chain} = createTestChain();

	t.notThrows(() => {
		chain.skipIf(true).only('title', () => {});
	});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.skipped, true);
	t.is(calls[0].metadata.exclusive, undefined);
});

test('runIf() skips terminal .serial.only chains when condition is false', t => {
	const {calls, chain} = createTestChain();

	t.notThrows(() => {
		chain.runIf(false).serial.only('title', () => {});
	});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.serial, true);
	t.is(calls[0].metadata.skipped, true);
	t.is(calls[0].metadata.exclusive, undefined);
});

test('skipIf() does not add conditional modifiers to terminal .only chains', t => {
	const {chain} = createTestChain();

	t.is(chain.skipIf(false).only.skipIf, undefined);
	t.is(chain.skipIf(false).only.runIf, undefined);
});

test('skipIf() keeps .todo chaining available', t => {
	const {calls, chain} = createTestChain();

	t.notThrows(() => {
		chain.skipIf(true).todo('title');
		chain.skipIf(false).todo('title');
	});

	t.is(calls.length, 2);
	t.is(calls[0].metadata.todo, true);
	t.is(calls[1].metadata.todo, true);
});

test('skipIf(false) and runIf(true) behave as no-op for todo chains', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).todo('title');
	chain.runIf(true).todo('title');
	chain.serial.skipIf(false).todo('title');
	chain.serial.runIf(true).todo('title');

	t.is(calls.length, 4);
	t.is(calls[0].metadata.skipped, undefined);
	t.is(calls[1].metadata.skipped, undefined);
	t.is(calls[2].metadata.skipped, undefined);
	t.is(calls[3].metadata.skipped, undefined);
});

test('serial.skipIf() skips with serial flag preserved', t => {
	const {calls, chain} = createTestChain();

	chain.serial.skipIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.serial, true);
	t.is(calls[0].metadata.skipped, true);
});

test('failing.skipIf() skips with failing flag preserved', t => {
	const {calls, chain} = createTestChain();

	chain.failing.skipIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.failing, true);
	t.is(calls[0].metadata.skipped, true);
});

test('serial.failing.skipIf() skips with serial and failing flags preserved', t => {
	const {calls, chain} = createTestChain();

	chain.serial.failing.skipIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.serial, true);
	t.is(calls[0].metadata.failing, true);
	t.is(calls[0].metadata.skipped, true);
});

test('skipIf(true).todo() does not set skipped', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).todo('title');

	t.is(calls.length, 1);
	t.is(calls[0].metadata.todo, true);
	t.is(calls[0].metadata.skipped, undefined);
});

test('conditional chains preserve hook access when skipped', t => {
	const {calls, chain} = createTestChain();

	t.notThrows(() => {
		chain.skipIf(true).beforeEach('title', () => {});
		chain.runIf(false).afterEach('title', () => {});
	});

	t.is(calls.length, 2);
	t.is(calls[0].metadata.type, 'beforeEach');
	t.is(calls[0].metadata.skipped, undefined);
	t.is(calls[1].metadata.type, 'afterEach');
	t.is(calls[1].metadata.skipped, undefined);
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

	t.is(typeof chain.skipIf(true).macro, 'function');
	t.is(typeof chain.runIf(false).macro, 'function');
	t.is(skippedFunctionMacro.exec, execFunction);
	t.is(runIfFunctionMacro.exec, execFunction);
	t.is(skippedObjectMacro.exec, execFunction);
	t.is(skippedObjectMacro.title, titleFunction);
	t.is(runIfObjectMacro.exec, execFunction);
	t.is(runIfObjectMacro.title, titleFunction);
	t.is(chain.skipIf(true).meta, chain.meta);
	t.is(chain.runIf(false).meta, chain.meta);
});

test('skip state is irreversible: runIf(true) cannot undo a prior skipIf(true)', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).serial.runIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.serial, true);
	t.is(calls[0].metadata.skipped, true);
});

test('accessing non-configurable accessor without getter on conditional chains returns undefined (proxy invariant)', t => {
	const {chain} = createTestChain();

	Object.defineProperty(chain, 'noGetter', {
		configurable: false,
		get: undefined,
		set() {},
	});

	t.is(chain.skipIf(true).noGetter, undefined);
	t.is(chain.skipIf(false).noGetter, undefined);
	t.is(chain.runIf(false).noGetter, undefined);
	t.is(chain.runIf(true).noGetter, undefined);
});

test('skipIf().skipIf() skips if either condition is true', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).skipIf(false)('title', () => {});
	chain.skipIf(false).skipIf(true)('title', () => {});

	t.is(calls.length, 2);
	t.is(calls[0].metadata.skipped, true);
	t.is(calls[1].metadata.skipped, true);
});

test('skipIf().skipIf() does not skip if both conditions are false', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).skipIf(false)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.skipped, undefined);
});

test('runIf().runIf() skips if either condition is false', t => {
	const {calls, chain} = createTestChain();

	chain.runIf(true).runIf(false)('title', () => {});
	chain.runIf(false).runIf(true)('title', () => {});

	t.is(calls.length, 2);
	t.is(calls[0].metadata.skipped, true);
	t.is(calls[1].metadata.skipped, true);
});

test('runIf().runIf() does not skip if both conditions are true', t => {
	const {calls, chain} = createTestChain();

	chain.runIf(true).runIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.skipped, undefined);
});

test('skipIf().runIf() skips if skipIf condition is true or runIf condition is false', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(true).runIf(true)('title', () => {}); // `skipIf` wins
	chain.skipIf(false).runIf(false)('title', () => {}); // `runIf` wins

	t.is(calls.length, 2);
	t.is(calls[0].metadata.skipped, true);
	t.is(calls[1].metadata.skipped, true);
});

test('skipIf(false).runIf(true) does not skip', t => {
	const {calls, chain} = createTestChain();

	chain.skipIf(false).runIf(true)('title', () => {});

	t.is(calls.length, 1);
	t.is(calls[0].metadata.skipped, undefined);
});
