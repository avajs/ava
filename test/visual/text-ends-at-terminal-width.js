import delay from 'delay';
import test from '../..';

function writeFullWidth(even, adjust) {
	return async function (t) {
		await delay(200);
		const len = Math[even ? 'floor' : 'ceil']((process.stdout.columns + adjust) / 2);
		for (let i = 0; i < len; i++) {
			process.stdout.write(String(i % 10));
			await delay(1); // eslint-disable-line no-await-in-loop
		}
		await delay(200);
		t.pass();
	};
}

// Line 1 (exactly full width)
test.serial(writeFullWidth(true, 0));
test.serial(writeFullWidth(false, 0));

// Line 2 (one extra char on line 3)
test.serial(writeFullWidth(true, 1));
test.serial(writeFullWidth(false, 1));

// Line 3 (ends one char short of complete width)
test.serial(writeFullWidth(true, -2));
test.serial(writeFullWidth(false, -2));

// Line 4 (completes line 3 and ends the next line exactly complete width)
test.serial(writeFullWidth(true, 1));
test.serial(writeFullWidth(false, 1));

// Line 5 (exact complete width)
test.serial(writeFullWidth(true, 0));
test.serial(writeFullWidth(false, 0));

// Line 6 (exact complete width)
test.serial(writeFullWidth(true, 0));
test.serial(writeFullWidth(false, 0));
