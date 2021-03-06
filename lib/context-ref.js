import clone from 'lodash/clone.js';

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
			this.set(clone(this.ref.get()));
		}

		return super.get();
	}

	set(newValue) {
		this.bound = true;
		super.set(newValue);
	}
}
