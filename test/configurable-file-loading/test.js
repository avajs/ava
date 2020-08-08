const test = require('@ava/test');
const exec = require('../helpers/exec');

const getByPath = (object, flatProperties) => {
	let output = object;
	const properties = flatProperties.split('.');

	for (const property of properties) {
		output = output[property];

		if (output === null || output === undefined) {
			return null;
		}
	}

	return output;
};

const pickProperties = (properties, object) => {
	const output = Object.create(null);

	for (const property of properties) {
		Reflect.set(output, property, getByPath(object, property));
	}

	return output;
};

const propertiesToSnapshot = [
	'exitCode',
	'failed',
	'stats.failed',
	'stats.passed'
];

test('load js, cjs, and mjs extensions when set to true', async t => {
	if (process.versions.node < '12.0.0') {
		t.pass();
	} else {
		const result = await exec.fixture(['--config', 'ava-std.config.js']);
		t.snapshot(pickProperties(propertiesToSnapshot, result), 'standard node extensions');
	}
});

test('cannot configure how js, cjs, and mjs extensions should be loaded', async t => {
	let result;

	result = await t.throwsAsync(exec.fixture(['--config', 'ava-js-err.config.js']));
	t.snapshot(pickProperties(propertiesToSnapshot, result), 'js not set as true');

	result = await t.throwsAsync(exec.fixture(['--config', 'ava-cjs-err.config.js']));
	t.snapshot(pickProperties(propertiesToSnapshot, result), 'cjs not set as true');

	result = await t.throwsAsync(exec.fixture(['--config', 'ava-mjs-err.config.js']));
	t.snapshot(pickProperties(propertiesToSnapshot, result), 'mjs not set as true');
});

test('load custom extension as commonjs', async t => {
	const result = await exec.fixture(['--config', 'ava-ts.config.js']);
	t.snapshot(pickProperties(propertiesToSnapshot, result), 'ts extension');
});

test('cannot load custom extension when not set to "commonjs" or "module"', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'ava-ts-err.config.js']));
	t.snapshot(pickProperties(propertiesToSnapshot, result), 'ts not set as ("commonjs" | "module")');
});
