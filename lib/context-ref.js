export default class ContextRef {
	constructor() {
		this.value = {};
	}

	get() {
		return this.value;
	}

	set(newValue) {
		this.value = newValue;
	}

	copy() {
		return new LateBinding(this);
	}
}

class LateBinding extends ContextRef {
	constructor(ref) {
		super();
		this.ref = ref;
		this.bound = false;
	}

	get() {
		if (!this.bound) {
			const value = this.ref.get();
			this.set(value !== null && typeof value === 'object' ? {...value} : value);
		}

		return super.get();
	}

	set(newValue) {
		this.bound = true;
		super.set(newValue);
	}
}
