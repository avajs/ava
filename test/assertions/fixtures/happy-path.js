import test from 'ava';

const passes = async (t, assertion, ...args) => {
	await t[assertion](...args);
};

passes.title = (_, assertion, ...args) => `t.${assertion}(${args.map(v => JSON.stringify(v)).join(', ')}) passes`;

// @ts-ignore
test(passes, 'pass');
// @ts-ignore
test(passes, 'is', 1, 1);
// @ts-ignore
test(passes, 'not', 1, 2);
// @ts-ignore
test(passes, 'deepEqual', {foo: 'bar'}, {foo: 'bar'});
// @ts-ignore
test(passes, 'notDeepEqual', {foo: 'bar'}, {foo: 'baz'});
// @ts-ignore
test(passes, 'like', {
	foo: 'bar',
	deep: {
		buz: 'qux',
		extra: 'irrelevant',
	},
	extra: 'irrelevant',
	deepExtra: {
		extra: 'irrelevant',
	},
}, {
	foo: 'bar',
	deep: {
		buz: 'qux',
	},
});
// @ts-ignore
test(passes, 'throws', () => {
	throw new Error('error');
});
// @ts-ignore
test(passes, 'throwsAsync', async () => {
	throw new Error('error');
});
// @ts-ignore
test(passes, 'notThrows', () => {});
// @ts-ignore
test(passes, 'notThrowsAsync', async () => {});
// @ts-ignore
test(passes, 'snapshot', {foo: 'bar'});
// @ts-ignore
test(passes, 'truthy', 1);
// @ts-ignore
test(passes, 'falsy', '');
// @ts-ignore
test(passes, 'true', true);
// @ts-ignore
test(passes, 'false', false);
// @ts-ignore
test(passes, 'regex', 'foo', /foo/);
// @ts-ignore
test(passes, 'notRegex', 'bar', /foo/);
// @ts-ignore
test(passes, 'assert', 1);
