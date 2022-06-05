import test from 'ava';
import {expectType} from 'tsd';

type Expected = {foo: 'bar'};
const expected: Expected = {foo: 'bar'};

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

test('true', t => {
	const actual: unknown = false;
	if (t.true(actual)) {
		expectType<true>(actual);
	}
});
