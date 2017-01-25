'use strict';

function validate(title, fn, metadata) {
	if (metadata.type !== 'test') {
		if (metadata.exclusive) {
			return '`only` is only for tests and cannot be used with hooks';
		}

		if (metadata.failing) {
			return '`failing` is only for tests and cannot be used with hooks';
		}

		if (metadata.todo) {
			return '`todo` is only for documentation of future tests and cannot be used with hooks';
		}
	}

	if (metadata.todo) {
		if (typeof fn === 'function') {
			return '`todo` tests are not allowed to have an implementation. Use ' +
			'`test.skip()` for tests with an implementation.';
		}

		if (typeof title !== 'string') {
			return '`todo` tests require a title';
		}

		if (metadata.skipped || metadata.failing || metadata.exclusive) {
			return '`todo` tests are just for documentation and cannot be used with `skip`, `only`, or `failing`';
		}
	} else if (typeof fn !== 'function') {
		return 'Expected an implementation. Use `test.todo()` for tests without an implementation.';
	}

	if (metadata.always) {
		if (!(metadata.type === 'after' || metadata.type === 'afterEach')) {
			return '`always` can only be used with `after` and `afterEach`';
		}
	}

	if (metadata.skipped && metadata.exclusive) {
		return '`only` tests cannot be skipped';
	}

	return null;
}

module.exports = validate;
