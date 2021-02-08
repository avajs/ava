import {expectError} from 'tsd';
import test from '..';

test('snapshot', t => {
	t.snapshot({foo: 'bar'});
	t.snapshot(null, 'a snapshot with a message');
	expectError(t.snapshot('hello world', null));
	// See https://github.com/avajs/ava/issues/2669
	expectError(t.snapshot({foo: 'bar'}, {id: 'an id'}));
});

test('snapshot.skip', t => {
	t.snapshot.skip({foo: 'bar'});
	t.snapshot.skip(null, 'a snapshot with a message');
	expectError(t.snapshot.skip('hello world', null));
	// See https://github.com/avajs/ava/issues/2669
	expectError(t.snapshot.skip({foo: 'bar'}, {id: 'an id'}));
});
