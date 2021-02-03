const test = require('ava');

test('some snapshots', t => {
	t.snapshot.skip(null, {id: 'an id'}); // eslint-disable-line ava/no-skip-assert
	t.snapshot('one');
	t.snapshot('two');
});
