import test from '../../..';
import {defaultValue, expectedName, name} from '.';

test('works', t => {
	t.is(process.env[name], process.env[expectedName] || defaultValue);
});
