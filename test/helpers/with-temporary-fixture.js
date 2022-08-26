import fse from 'fs-extra';
import {temporaryDirectoryTask} from 'tempy';

export async function withTemporaryFixture(cwd, task) {
	let result;
	await temporaryDirectoryTask(async temporary => {
		await fse.copy(cwd, temporary);
		result = await task(temporary);
	});

	return result;
}
