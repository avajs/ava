import test from 'ava';
import {expectType} from 'tsd';

test('actual extends expected', t => {
	type Expected = {foo: [1, 2, 3]};
	const expected: Expected = {foo: [1, 2, 3]};
	const actual = {foo: [1, 2, 3]};
	if (t.deepEqual(actual, expected)) {
		expectType<Expected>(actual);
	}
});

test('expected extends actual', t => {
	type Expected = {foo: Array<number | string>};
	type Actual = {foo: number[]};
	const expected: Expected = {foo: [1, 2, 3]};
	const actual: Actual = {foo: [1, 2, 3]};
	if (t.deepEqual(actual, expected)) {
		expectType<Actual>(expected);
	}
});

test('neither extends the each other', t => {
	type Expected = {readonly foo: readonly [1, 2, 3]};
	type Actual = {foo: number[]};
	const expected: Expected = {foo: [1, 2, 3]};
	const actual: Actual = {foo: [1, 2, 3]};
	t.deepEqual(actual, expected);
});
