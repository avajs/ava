import test from '../../..';

import {restoreAfterFirstCall} from './hack';

restoreAfterFirstCall();

test('test', async () => {
	throw new Error('Hi :)');
});
