const {Buffer} = require('node:buffer');

const test = require(process.env.TEST_AVA_IMPORT_FROM);

for (let i = 0; i < 2; i++) {
	test(`large snapshot ${i}`, t => {
		t.snapshot(Buffer.alloc(1024 * 16));
	});
}
