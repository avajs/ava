import test from '../../entrypoints/main.js';

test('test', t => {
	t.teardown(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
	t.teardown(async () => {}); // eslint-disable-line @typescript-eslint/no-empty-function
	t.teardown({[Symbol.dispose]() {}});
	t.teardown({async [Symbol.asyncDispose]() {}});
	t.teardown({
		[Symbol.dispose]() {},
		async [Symbol.asyncDispose]() {},
	});
});

test.before(t => {
	t.teardown({[Symbol.dispose]() {}});
});

test.beforeEach(t => {
	t.teardown({async [Symbol.asyncDispose]() {}});
});
