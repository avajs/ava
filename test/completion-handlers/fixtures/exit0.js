import test, {registerCompletionHandler} from 'ava';

registerCompletionHandler(() => {
	process.exit(0); // eslint-disable-line unicorn/no-process-exit
});

test('pass', t => t.pass());
