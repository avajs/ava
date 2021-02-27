const tempy = require('tempy');
const fse = require('fs-extra');

const withTemporaryFixture = cwd => async (t, implementation, ...args) => {
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		await implementation(t, temporary, ...args);
	});
};

module.exports.withTemporaryFixture = withTemporaryFixture;
