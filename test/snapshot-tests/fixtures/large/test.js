import {Buffer} from 'node:buffer';

const {default: test} = await import(process.env.TEST_AVA_IMPORT_FROM);

for (let i = 0; i < 2; i++) {
	test(`large snapshot ${i}`, t => {
		t.snapshot(Buffer.alloc(1024 * 16));
	});
}
