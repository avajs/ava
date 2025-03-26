/**
 * The WatchModeSkipTests class is used to determine
 * if a test should be skipped using filters provided
 * by the user in watch mode.
 */
export class WatchModeSkipTests {
	/**
	 * Properties are public to allow
	 * for easy sending to the worker.
	 */
	fileRegexOrNull = null;
	testRegexOrNull = null;

	constructor(watchModeSkipTestsData = undefined) {
		if (!watchModeSkipTestsData) {
			return;
		}

		this.fileRegexOrNull = watchModeSkipTestsData.fileRegexOrNull;
		this.testRegexOrNull = watchModeSkipTestsData.testRegexOrNull;
	}

	shouldSkipFile(file) {
		if (this.fileRegexOrNull === null) {
			return false;
		}

		return !this.fileRegexOrNull.test(file);
	}

	shouldSkipTest(testTitle) {
		if (this.testRegexOrNull === null) {
			return false;
		}

		return !this.testRegexOrNull.test(testTitle);
	}

	hasAnyFilters() {
		return this.fileRegexOrNull !== null || this.testRegexOrNull !== null;
	}

	shouldSkipEvent(event) {
		return (
			this.shouldSkipFile(event.testFile) || this.shouldSkipTest(event.title)
		);
	}

	replaceFileRegex(fileRegexOrNull) {
		this.fileRegexOrNull = fileRegexOrNull;
	}

	replaceTestRegex(testRegexOrNull) {
		this.testRegexOrNull = testRegexOrNull;
	}
}
