import test from 'ava';
import {foo} from '../src/foo.js';
test('foo', t => { t.is(foo, 1); });
