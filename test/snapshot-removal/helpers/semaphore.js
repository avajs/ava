class Semaphore {
	constructor(value) {
		this.value = value;
		this.stack = [];
	}

	async wait() {
		this.value--;

		if (this.value < 0) {
			return new Promise(resolve => {
				this.stack.push(resolve);
			});
		}
	}

	signal() {
		this.value++;

		if (this.value <= 0) {
			this.stack.pop()();
		}
	}

	async task(job) {
		await this.wait();
		try {
			return await job();
		} finally {
			this.signal();
		}
	}
}

module.exports = Semaphore;
