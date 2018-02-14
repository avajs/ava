import test from '../..';

test('throw an error without a message', () => {
	throw new Error(); // eslint-disable-line unicorn/error-message
});
