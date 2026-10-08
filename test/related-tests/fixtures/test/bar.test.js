import test from 'ava';
import {bar} from '../src/bar.js';
test('bar', t => { t.is(bar, 2); });
