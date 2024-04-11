const test = require(process.env.TEST_AVA_REQUIRE_FROM);

for (let i = 0; i < 2; i++) {
	test(`large snapshot ${i}`, t => {
		t.snapshot(new Uint8Array(1024 * 16));
	});
}
