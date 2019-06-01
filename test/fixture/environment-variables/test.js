import test from '../../..';
import {name, value} from '.';

test('works', t => {
	t.is(process.env[name], value);
});
