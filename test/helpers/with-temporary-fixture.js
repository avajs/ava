import fse from 'fs-extra';
import tempy from 'tempy';

export async function withTemporaryFixture(cwd, task) {
	let result;
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		result = await task(temporary);
	});

	return result;
}
