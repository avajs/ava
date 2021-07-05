import test from '..';

test('return a promise-like', t => {
	return {
		then(resolve) {
			resolve?.();
		}
	};
});

test('return a subscribable', t => {
	return {
		subscribe({complete}) {
			complete();
		}
	};
});

test.after('return anything else', t => {
	return {
		foo: 'bar',
		subscribe() {},
		then() {}
	};
});
