import test from '../../../entrypoints/main.js';

for (const title of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
	test(title, t => {
		console.log(`ORDER:${title}`);
		t.pass();
	});
}

test.serial('serial one', t => {
	console.log('ORDER:serial one');
	t.pass();
});
test.serial('serial two', t => {
	console.log('ORDER:serial two');
	t.pass();
});
