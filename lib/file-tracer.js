import {nodeFileTrace} from '@vercel/nft';

// State management for file tracer.
class Node {
	#children = new Map();
	#parents = new Map();
	isTest = false;

	constructor(path) {
		this.path = path;
	}

	#addParent(node) {
		this.#parents.set(node.path, node);
	}

	#removeChild(node) {
		this.#children.delete(node.path);
	}

	#removeParent(node) {
		this.#parents.delete(node.path);
	}

	get parents() {
		return this.#parents.keys();
	}

	addChild(node) {
		this.#children.set(node.path, node);
		node.#addParent(this);
	}

	prune() {
		for (const child of this.#children.values()) {
			child.#removeParent(this);
		}

		for (const parent of this.#parents.values()) {
			parent.#removeChild(this);
		}
	}
}

class Tree extends Map {
	get(path) {
		if (!this.has(path)) {
			this.set(path, new Node(path));
		}

		return super.get(path);
	}

	delete(path) {
		const node = this.get(path);
		node?.prune();
		super.delete(path);
	}
}

// Track file dependencies to determine which test files to run.
export default class FileTracer {
	#base;
	#warnings = new Set();
	#cache = Object.create(null);
	#pendingTrace = null;
	#tree = new Tree();

	constructor({base}) {
		this.#base = base;
	}

	async #update(changes) {
		await this.#pendingTrace; // Guard against race conditions.

		let shouldReuseCache = true;
		const knownTestFiles = new Set();
		const deletedFiles = new Set();
		const filesToTrace = new Set();
		for (const {path, isTest, exists} of await changes) {
			if (exists) {
				if (isTest) {
					knownTestFiles.add(path);
				}

				filesToTrace.add(path);
			} else {
				deletedFiles.add(path);
			}

			// The cache can be reused as long as the changes are just for new files.
			shouldReuseCache &&= !this.#tree.has(path);
		}

		// Remove deleted files from the tree.
		for (const path of deletedFiles) {
			this.#tree.delete(path);
		}

		// Create a new cache if the old one can't be reused.
		if (!shouldReuseCache) {
			this.#cache = Object.create(null);
		}

		// If all changes are deletions then there is no more work to do.
		if (filesToTrace.size === 0) {
			return;
		}

		// Always retrace all test files, in case a file was deleted and then replaced.
		for (const node of this.#tree.values()) {
			if (node.isTest) {
				filesToTrace.add(node.path);
			}
		}

		// Trace any new and changed files.
		const {fileList, reasons, warnings} = await nodeFileTrace([...filesToTrace], {
			analysis: { // Only trace exact imports.
				emitGlobs: false,
				computeFileReferences: false,
				evaluatePureExpressions: true,
			},
			base: this.#base,
			cache: this.#cache,
			conditions: ['node'],
			exportsOnly: true, // Disregard "main" in package files when "exports" is present.
			ignore: ['**/node_modules/**'], // Don't trace through installed dependencies.
		});
		this.#warnings = warnings;

		// Update the tree.
		for (const path of fileList) {
			const node = this.#tree.get(path);
			node.isTest = knownTestFiles.has(path);

			const {parents} = reasons.get(path);
			for (const parent of parents) {
				const parentNode = this.#tree.get(parent);
				parentNode.addChild(node);
			}
		}
	}

	get busy() {
		return this.#pendingTrace;
	}

	get warnings() {
		return this.#warnings;
	}

	traceToTestFile(startingPath, {shouldTraceTestParents = false} = {}) {
		const todo = [startingPath];
		const testFiles = new Set();
		const visited = new Set();
		for (let index = 0; index < todo.length; index++) {
			const dependencyPath = todo[index];
			if (visited.has(dependencyPath)) {
				continue;
			}

			visited.add(dependencyPath);

			const node = this.#tree.get(dependencyPath);
			if (node === undefined) {
				continue;
			}

			if (node.isTest) {
				testFiles.add(node.path);
			}

			if (shouldTraceTestParents || !node.isTest) {
				todo.push(...node.parents);
			}
		}

		return [...testFiles];
	}

	addDependency(testFile, path) {
		const testNode = this.#tree.get(testFile);
		testNode.isTest = true;

		const node = this.#tree.get(path);
		testNode.addChild(node);
	}

	has(path) {
		return this.#tree.has(path);
	}

	update(changes) {
		const current = this.#update(changes).finally(() => {
			if (this.#pendingTrace === current) {
				this.#pendingTrace = null;
			}
		});

		this.#pendingTrace = current;
	}
}
