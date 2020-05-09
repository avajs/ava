const test = require('@ava/test');
const exec = require('../../helpers/exec');

test('can load ESM workers from file URL', async t => {
	await t.notThrowsAsync(exec.fixture(['file-url.js']));
});

if (process.platform !== 'win32') {
	test('can load ESM workers from absolute posix path', async t => {
		await t.notThrowsAsync(exec.fixture(['posix-path.js']));
	});
}
