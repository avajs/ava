import test from '../../../';

import { restoreAfterFirstCall } from './hack';
restoreAfterFirstCall();

test(() => {
	return Promise.reject(new Error('Hi :)'));
});
