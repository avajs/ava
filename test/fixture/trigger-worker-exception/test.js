import test from '../../..';

import {restoreAfterFirstCall} from './hack';

restoreAfterFirstCall();

// eslint-disable-next-line require-await
test('test', async () => {
	throw new Error('Hi :)');
});
