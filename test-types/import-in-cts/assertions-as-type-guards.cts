import test from '../../entrypoints/main.cjs';
import {expectType} from 'tsd';

type Expected = {foo: 'bar'};
const expected: Expected = {foo: 'bar'};

test('assert', t => {
	const actual = expected as Expected | undefined;
	if (t.assert(actual)) {
		expectType<Expected>(actual);
	}
});

test('deepEqual', t => {
	const actual: unknown = {};
	if (t.deepEqual(actual, expected)) {
		expectType<Expected>(actual);
	}
});

test('like', t => {
	const actual: unknown = {};
	if (t.like(actual, expected)) {
		expectType<Expected>(actual);
	}
});

test('is', t => {
	const actual: unknown = 2;
	if (t.is(actual, 3 as const)) {
		expectType<3>(actual);
	}
});

test('false', t => {
	const actual: unknown = true;
	if (t.false(actual)) {
		expectType<false>(actual);
	}
});

test('falsy', t => {
	type Actual = Expected | undefined | false | 0 | '' | 0n;
	const actual = undefined as Actual;
	if (t.falsy(actual)) {
		expectType<Exclude<Actual, Expected>>(actual);
	}
});

test('true', t => {
	const actual: unknown = false;
	if (t.true(actual)) {
		expectType<true>(actual);
	}
});

test('truthy', t => {
	const actual = expected as Expected | undefined;
	if (t.truthy(actual)) {
		expectType<Expected>(actual);
	}
});
