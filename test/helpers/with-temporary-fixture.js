const tempy = require('tempy');
const fse = require('fs-extra');

async function withTemporaryFixture(cwd, task) {
	let result;
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		result = await task(temporary);
	});

	return result;
}

module.exports.withTemporaryFixture = withTemporaryFixture;
