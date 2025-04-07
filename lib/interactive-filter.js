/**
 * The InteractiveFilter class is used to determine
 * if a test should be skipped using filters provided
 * by the user in watch mode.
 */
export class InteractiveFilter {
	#filepathRegex = null;

	replaceFilepathRegex(filepathRegex) {
		const filterHasChanged = !this.#regexesAreEqual(this.#filepathRegex, filepathRegex);
		this.#filepathRegex = filepathRegex;
		return filterHasChanged;
	}

	#testTitleRegex = null;

	replaceTestTitleRegex(testTitleRegex) {
		const filterHasChanged = !this.#regexesAreEqual(this.#testTitleRegex, testTitleRegex);
		this.#testTitleRegex = testTitleRegex;
		return filterHasChanged;
	}

	#regexesAreEqual(a, b) {
		return a?.source === b?.source && a?.flags === b?.flags;
	}

	constructor(interactiveFilterData = undefined) {
		if (!interactiveFilterData) {
			return;
		}

		this.#filepathRegex = interactiveFilterData.filepathRegex;
		this.#testTitleRegex = interactiveFilterData.testTitleRegex;
	}

	getData() {
		return {
			filepathRegex: this.#filepathRegex,
			testTitleRegex: this.#testTitleRegex,
		};
	}

	printFilePathRegex() {
		if (!this.#filepathRegex) {
			return '';
		}

		return `Current filename filter is ${this.#filepathRegex}`;
	}

	printTestTitleRegex() {
		if (!this.#testTitleRegex) {
			return '';
		}

		return `Current test title filter is ${this.#testTitleRegex}`;
	}

	shouldSkipThisFile(file) {
		if (this.#filepathRegex === null) {
			return false;
		}

		return !this.#filepathRegex.test(file);
	}

	canSelectTestsInThisFile(file) {
		return this.#filepathRegex?.test(file) ?? true;
	}

	shouldSelectTest(testTitle) {
		return this.#testTitleRegex?.test(testTitle) ?? true;
	}

	hasAnyFilters() {
		return this.#filepathRegex !== null || this.#testTitleRegex !== null;
	}
}
