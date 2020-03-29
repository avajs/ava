import {expectType} from 'tsd';
import test, {ExecutionContext, Macro} from '..';

test('attempt', async t => {
	const attempt = await t.try(
		(u, a, b) => {
			expectType<ExecutionContext>(u);
			expectType<string>(a);
			expectType<number>(b);
		},
		'string',
		6
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
		6
	);
	attempt.commit();
});

test('multiple attempts', async t => {
	const attempts = [
		...await t.try([tt => tt.pass(), tt => tt.pass()]),
		...await t.try('title', [tt => tt.pass(), tt => tt.pass()])
	];
	for (const attempt of attempts) {
		attempt.commit();
	}
});

{
	const lengthCheck = (t: ExecutionContext, a: string, b: number): void => {
		t.is(a.length, b);
	};

	test('attempt with helper', async t => {
		const attempt = await t.try(lengthCheck, 'string', 6);
		attempt.commit();
	});

	test('attempt with title', async t => {
		const attempt = await t.try('title', lengthCheck, 'string', 6);
		attempt.commit();
	});
}

test('all possible variants to pass to t.try', async t => {
	// No params
	t.try(tt => tt.pass());
	/* Fails as expected */ // t.try([]);
	t.try([tt => tt.pass()]);
	t.try([tt => tt.pass(), tt => tt.fail()]);

	t.try('test', tt => tt.pass());
	/* Fails as expected */ // t.try('test', []);
	t.try('test', [tt => tt.pass()]);
	t.try('test', [tt => tt.pass(), tt => tt.fail()]);

	// Some params
	t.try((tt, a, b) => tt.is(a.length, b), 'hello', 5);
	/* Fails as expected */ // t.try([], 'hello', 5);
	t.try([(tt, a, b) => tt.is(a.length, b)], 'hello', 5);
	t.try([(tt, a, b) => tt.is(a.length, b), (tt, a, b) => tt.is(a.slice(b), '')], 'hello', 5);

	t.try('test', (tt, a, b) => tt.is(a.length, b), 'hello', 5);
	/* Fails as expected */ // t.try('test', [], 'hello', 5);
	t.try('test', [(tt, a, b) => tt.is(a.length, b)], 'hello', 5);
	t.try('test', [(tt, a, b) => tt.is(a.length, b), (tt, a, b) => tt.is(a.slice(b), '')], 'hello', 5);

	// Macro with title
	const macro1: Macro<[string, number]> = (tt, a, b) => tt.is(a.length, b);
	macro1.title = (title, a, b) => `${title ? `${String(title)} ` : ''}str: "${String(a)}" with len: "${String(b)}"`;
	const macro2: Macro<[string, number]> = (tt, a, b) => tt.is(a.slice(b), '');

	t.try([macro1, macro2], 'hello', 5);
	t.try('title', [macro1, macro2], 'hello', 5);
});
