import {execa} from 'execa';
import {test} from 'tap';

test('Throws error when required from the REPL', t => execa('node', ['-r', 'ava'], {reject: false}).then(result => {
	t.match(result.stderr, 'The ’ava’ module can only be imported in test files');
}));
