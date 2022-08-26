import type {ExecutionContext} from 'ava';
import test from 'ava';
import {expectType} from 'tsd';

test('attempt', async t => {
	const attempt = await t.try(
		(u, a, b) => {
			expectType<ExecutionContext>(u);
			expectType<string>(a);
			expectType<number>(b);
		},
		'string',
		6,
	);
	attempt.commit();
});

test('attempt with title', async t => {
	const attempt = await t.try(
		'attempt title',
		(u, a, b) => {
			expectType<ExecutionContext>(u);
			expectType<string>(a);
			expectType<number>(b);
		},
		'string',
		6,
	);
	attempt.commit();
});

const lengthCheck = (t: ExecutionContext, a: string, b: number): void => {
	t.is(a.length, b);
};

test('attempt with helper', async t => {
	const attempt = await t.try(lengthCheck, 'string', 6);
	attempt.commit();
});

test('attempt with title and helper', async t => {
	const attempt = await t.try('title', lengthCheck, 'string', 6);
	attempt.commit();
});

test('all possible variants to pass to t.try', async t => {
	// No params
	void t.try(tt => tt.pass());

	void t.try('test', tt => tt.pass());

	// Some params
	void t.try((tt, a, b) => tt.is(a.length, b), 'hello', 5);

	void t.try('test', (tt, a, b) => tt.is(a.length, b), 'hello', 5);

	// Macro with title
	const macro1 = test.macro<[string, number]>({ // eslint-disable-line ava/no-nested-tests
		exec: (tt, a, b) => tt.is(a.length, b),
		title: (title, a, b) => `${title ? `${String(title)} ` : ''}str: "${String(a)}" with len: "${String(b)}"`,
	});
	const macro2 = test.macro<[string, number]>((tt, a, b) => { // eslint-disable-line ava/no-nested-tests
		tt.is(a.slice(b), '');
	});

	void t.try(macro1, 'hello', 5);
	void t.try(macro2, 'hello', 5);
	void t.try('title', macro1, 'hello', 5);
	void t.try('title', macro2, 'hello', 5);
});
