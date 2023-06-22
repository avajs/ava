import fs from 'node:fs/promises';

import {temporaryDirectoryTask} from 'tempy';

export async function withTemporaryFixture(cwd, task) {
	let result;
	await temporaryDirectoryTask(async temporary => {
		await fs.cp(cwd, temporary, {recursive: true});
		result = await task(temporary);
	});

	return result;
}
