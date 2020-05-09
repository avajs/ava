const test = require('ava');
const {random} = require('./_plugin');

test('the shared worker produces a random value', async t => {
	const {data} = await random;
	t.log(data);
	t.pass();
});
