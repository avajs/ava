import test from '../../../';

import {restoreAfterFirstCall} from './hack';

restoreAfterFirstCall();

test(async () => {
	throw new Error('Hi :)');
});
