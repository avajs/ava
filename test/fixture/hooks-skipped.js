import test from '../..';

test.before(() => {
	throw new Error('should not run');
});

test.after(() => {
	throw new Error('should not run');
});

test.beforeEach(() => {
	throw new Error('should not run');
});

test.afterEach(() => {
	throw new Error('should not run');
});

test.skip('some skipped test', t => {
	t.fail();
});
