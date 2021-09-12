import test from 'ava';

const passes = async (t, assertion, ...args) => {
	await t[assertion](...args);
};

passes.title = (_, assertion, ...args) => `t.${assertion}(${args.map(v => JSON.stringify(v)).join(', ')}) passes`;

test(passes, 'pass');
test(passes, 'is', 1, 1);
test(passes, 'not', 1, 2);
test(passes, 'deepEqual', {foo: 'bar'}, {foo: 'bar'});
test(passes, 'notDeepEqual', {foo: 'bar'}, {foo: 'baz'});
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
test(passes, 'throws', () => {
	throw new Error('error');
});
test(passes, 'throwsAsync', async () => {
	throw new Error('error');
});
test(passes, 'notThrows', () => {});
test(passes, 'notThrowsAsync', async () => {});
test(passes, 'snapshot', {foo: 'bar'});
test(passes, 'truthy', 1);
test(passes, 'falsy', '');
test(passes, 'true', true);
test(passes, 'false', false);
test(passes, 'regex', 'foo', /foo/);
test(passes, 'notRegex', 'bar', /foo/);
test(passes, 'assert', 1);
