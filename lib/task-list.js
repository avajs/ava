class Task {
	static after({annotations, args, implementation, options, title}) {
		return new Task(annotations.always ? 'afterAlways' : 'after', {annotations, args, implementation, options, title});
	}

	static afterEach({annotations, args, implementation, options, title}) {
		return new Task(annotations.always ? 'afterEachAlways' : 'afterEach', {annotations, args, implementation, options, title});
	}

	static before({annotations, args, implementation, options, title}) {
		return new Task('before', {annotations, args, implementation, options, title});
	}

	static beforeEach({annotations, args, implementation, options, title}) {
		return new Task('beforeEach', {annotations, args, implementation, options, title});
	}

	static test({annotations, args, implementation, options, title}) {
		return new Task('test', {annotations, args, implementation, options, title});
	}

	static todo({annotations, title}) {
		return new Task('todo', {annotations, title});
	}

	constructor(type, {annotations, args, implementation, options, title}) {
		this.annotations = annotations;
		this.args = args;
		this.implementation = implementation;
		this.options = options;
		this.title = title;
		this.type = type;

		this.previous = null;
	}
}

exports.Task = Task;

class TaskList {
	constructor(forkedFrom) {
		// Hooks are kept as a reverse linked list, so that forks can easily extend them.
		this.lastAfter = forkedFrom ? forkedFrom.lastAfter : null;
		this.lastAfterAlways = forkedFrom ? forkedFrom.lastAfterAlways : null;
		this.lastAfterEach = forkedFrom ? forkedFrom.lastAfterEach : null;
		this.lastAfterEachAlways = forkedFrom ? forkedFrom.lastAfterEachAlways : null;
		this.lastBefore = forkedFrom ? forkedFrom.lastBefore : null;
		this.lastBeforeEach = forkedFrom ? forkedFrom.lastBeforeEach : null;

		this.test = [];
		this.todo = [];
	}

	add(task) {
		switch (task.type) {
			case 'after':
				task.previous = this.lastAfter;
				this.lastAfter = task;
				break;
			case 'afterAlways':
				task.previous = this.lastAfterAlways;
				this.lastAfterAlways = task;
				break;
			case 'afterEach':
				task.previous = this.lastAfterEach;
				this.lastAfterEach = task;
				break;
			case 'afterEachAlways':
				task.previous = this.lastAfterEachAlways;
				this.lastAfterEachAlways = task;
				break;
			case 'before':
				task.previous = this.lastBefore;
				this.lastBefore = task;
				break;
			case 'beforeEach':
				task.previous = this.lastBeforeEach;
				this.lastBeforeEach = task;
				break;
			case 'test':
				this.test.push(task);
				break;
			case 'todo':
				this.todo.push(task);
				break;
			default:
				throw new TypeError(`Unhandled type ${task.type}`);
		}
	}

	fork() {
		return new TaskList(this);
	}

	* select(type) {
		if (type === 'test' || type === 'todo') {
			for (const task of this[type]) {
				yield task;
			}

			return;
		}

		let last;
		switch (type) {
			case 'after':
				last = this.lastAfter;
				break;
			case 'afterAlways':
				last = this.lastAfterAlways;
				break;
			case 'afterEach':
				last = this.lastAfterEach;
				break;
			case 'afterEachAlways':
				last = this.lastAfterEachAlways;
				break;
			case 'before':
				last = this.lastBefore;
				break;
			case 'beforeEach':
				last = this.lastBeforeEach;
				break;
			default:
				throw new TypeError(`Unknown type ${type}`);
		}

		const collected = [];
		while (last !== null) {
			if (!last.annotations.skipped) {
				collected.push(last);
			}

			last = last.previous;
		}

		for (let i = collected.length - 1; i >= 0; i--) {
			yield collected[i];
		}
	}
}

exports.TaskList = TaskList;
