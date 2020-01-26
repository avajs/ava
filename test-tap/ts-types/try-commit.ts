import test, {ExecutionContext, Macro} from '../..';

{
	test('attempt', async t => {
		const attempt = await t.try(
			(u, a, b) => {
				u.is(a.length, b);
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
				u.is(a.length, b);
			},
			'string',
			6
		);
		attempt.commit();
	});

	test('multiple attempts', async t => {
		const attempts = [
			...await t.try([tt => tt.pass(), tt => tt.pass()]),
			...await t.try('title', [tt => tt.pass(), tt => tt.pass()]),
		];
		for (const attempt of attempts) {
			attempt.commit();
		}
	});
}

{
	const lengthCheck = (t: ExecutionContext, a: string, b: number) => {
		t.is(a.length, b);
	};

	test('attempt with helper', async t => {
		const attempt = await t.try(lengthCheck, 'string', 6);
		attempt.commit();
	});

	test('attempt with title', async t => {
		const attempt = await t.try(lengthCheck, 'string', 6);
		attempt.commit();
	});
}

{
	test('all possible variants to pass to t.try', async t => {
		// no params
		t.try(tt => tt.pass());
		/* fails as expected */ // t.try([]);
		t.try([tt => tt.pass()]);
		t.try([tt => tt.pass(), tt => tt.fail()]);

		t.try('test', tt => tt.pass());
		/* fails as expected */ // t.try('test', []);
		t.try('test', [tt => tt.pass()]);
		t.try('test', [tt => tt.pass(), tt => tt.fail()]);

		// some params
		t.try((tt, a, b) => tt.is(a.length, b), 'hello', 5);
		/* fails as expected */ // t.try([], 'hello', 5);
		t.try([(tt, a, b) => tt.is(a.length, b)], 'hello', 5);
		t.try([(tt, a, b) => tt.is(a.length, b), (tt, a, b) => tt.is(a.slice(b), '')], 'hello', 5);

		t.try('test', (tt, a, b) => tt.is(a.length, b), 'hello', 5);
		/* fails as expected */ // t.try('test', [], 'hello', 5);
		t.try('test', [(tt, a, b) => tt.is(a.length, b)], 'hello', 5);
		t.try('test', [(tt, a, b) => tt.is(a.length, b), (tt, a, b) => tt.is(a.slice(b), '')], 'hello', 5);

		// macro with title
		const macro1: Macro<[string, number]> = (tt, a, b) => tt.is(a.length, b);
		macro1.title = (title, a, b) => `${title ? `${title} `: ''}str: "${a}" with len: "${b}"`;
		const macro2: Macro<[string, number]> = (tt, a, b) => tt.is(a.slice(b), '');

		t.try([macro1, macro2], 'hello', 5);
		t.try('title', [macro1, macro2], 'hello', 5);
	});
}
