import test from '../../../../../..';

test('test title', t => {
	t.snapshot({foo: 'bar'});

	t.snapshot({answer: 43});
});

test('another test', t => {
	t.snapshot(new Map());
});
