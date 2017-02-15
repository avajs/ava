import test from '../../../';

test(() => {
	return Promise.reject(new Error('Hi :)'));
});
