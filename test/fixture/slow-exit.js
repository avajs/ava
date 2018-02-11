import signalExit from 'signal-exit';
import test from '../../';

test.cb('long running', t => {
	t.plan(1);

	signalExit(() => {
		// Simulate an exit hook that lasts a short while
		const start = Date.now();

		while (Date.now() - start < 2000) {
			// Synchronously wait for 2 seconds
		}

		process.send({
			name: 'cleanup-completed',
			data: {completed: true},
			ava: true
		});
	}, {alwaysLast: true});

	setTimeout(() => {
		t.pass();
		t.end();
	});

	setTimeout(() => {
		// This would keep the process running for a long time
		console.log('I\'m gonna live forever!!');
	}, 15000);
});
