/**
 * The InteractiveFilter class is used to determine
 * if a test should be skipped using filters provided
 * by the user in watch mode.
 */
export class InteractiveFilter {
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

		this.#testTitleRegex = interactiveFilterData.testTitleRegex;
	}

	getData() {
		return {
			testTitleRegex: this.#testTitleRegex,
		};
	}

	printTestTitleRegex() {
		if (!this.#testTitleRegex) {
			return '';
		}

		return `Current test title filter is ${this.#testTitleRegex}`;
	}

	shouldSelectTest(testTitle) {
		return this.#testTitleRegex?.test(testTitle) ?? true;
	}

	hasAnyFilters() {
		return this.#testTitleRegex !== null;
	}
}
