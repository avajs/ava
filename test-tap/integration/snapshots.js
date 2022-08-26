import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {execa} from 'execa';
import {test} from 'tap';
import {temporaryDirectory} from 'tempy';

import {execCli} from '../helper/cli.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

for (const object of [
	{type: 'colocated', rel: '', dir: ''},
	{type: '__tests__', rel: '__tests__-dir', dir: '__tests__/__snapshots__'},
	{type: 'test', rel: 'test-dir', dir: 'test/snapshots'},
	{type: 'tests', rel: 'tests-dir', dir: 'tests/snapshots'},
]) {
	test(`snapshots work (${object.type})`, t => {
		const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', object.rel, object.dir, 'test.cjs.snap');
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}

		const dirname = path.join('fixture/snapshots', object.rel);
		// Test should pass, and a snapshot gets written
		execCli(['--update-snapshots'], {dirname, env: {AVA_FORCE_CI: 'not-ci'}}, error => {
			t.error(error);
			t.ok(fs.existsSync(snapPath));

			// Test should pass, and the snapshot gets used
			execCli([], {dirname}, error => {
				t.error(error);
				t.end();
			});
		});
	});
}

test('appends to existing snapshots', t => {
	const cliPath = fileURLToPath(new URL('../../entrypoints/cli.mjs', import.meta.url));
	const avaPath = fileURLToPath(new URL('../../entrypoints/main.cjs', import.meta.url));

	const cwd = temporaryDirectory();
	fs.writeFileSync(path.join(cwd, 'package.json'), '{}');

	const initial = `const test = require(${JSON.stringify(avaPath)})
test('one', t => {
	t.snapshot({one: true})
})`;
	fs.writeFileSync(path.join(cwd, 'test.cjs'), initial);

	const run = () => execa(process.execPath, [cliPath, '--no-color'], {cwd, env: {AVA_FORCE_CI: 'not-ci'}, reject: false});
	return run().then(result => {
		t.match(result.stdout, /1 test passed/);

		fs.writeFileSync(path.join(cwd, 'test.cjs'), `${initial}
test('two', t => {
	t.snapshot({two: true})
})`);
		return run();
	}).then(result => {
		t.match(result.stdout, /2 tests passed/);

		fs.writeFileSync(path.join(cwd, 'test.cjs'), `${initial}
test('two', t => {
	t.snapshot({two: false})
})`);

		return run();
	}).then(result => {
		t.match(result.stdout, /1 test failed/);
	});
});

test('outdated snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.cjs.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x00, 0x00]));

	execCli(['test.cjs'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is v0, but only v3 is supported\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('outdated snapshot version can be updated', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.cjs.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x00, 0x00]));

	execCli(['test.cjs', '--update-snapshots'], {dirname: 'fixture/snapshots', env: {AVA_FORCE_CI: 'not-ci'}}, (error, stdout) => {
		t.error(error);
		t.match(stdout, /2 tests passed/);
		t.end();
	});
});

test('newer snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.cjs.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0xFF, 0xFF]));

	execCli(['test.cjs'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is v65535, but only v3 is supported\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /You should upgrade AVA\./);
		t.end();
	});
});

test('snapshot corruption is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.cjs.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x03, 0x00]));

	execCli(['test.cjs'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is corrupted\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to recreate it\./);
		t.end();
	});
});

test('legacy snapshot files are reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.cjs.snap');
	fs.writeFileSync(snapPath, Buffer.from('// Jest Snapshot v1, https://goo.gl/fbAQLP\n'));

	execCli(['test.cjs'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file was created with AVA 0\.19\. It’s not supported by this AVA version\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('snapshots infer their location and name from sourcemaps', t => {
	t.plan(8);
	const relativeFixtureDir = path.join('fixture/snapshots/test-sourcemaps');
	const snapDirStructure = [
		'src',
		'src/test/snapshots',
		'src/feature/__tests__/__snapshots__',
	];
	const snapFixtureFilePaths = snapDirStructure
		.flatMap(snapRelativeDir => {
			const snapPath = path.join(__dirname, '..', relativeFixtureDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.ts.md'),
				path.join(snapPath, 'test.ts.snap'),
			];
		});
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};

	for (const x of snapFixtureFilePaths) {
		removeExistingSnapFixtureFiles(x);
	}

	const verifySnapFixtureFiles = relFilePath => {
		t.ok(fs.existsSync(relFilePath));
	};

	execCli([], {dirname: relativeFixtureDir, env: {AVA_FORCE_CI: 'not-ci'}}, (error, stdout) => {
		t.error(error);
		for (const x of snapFixtureFilePaths) {
			verifySnapFixtureFiles(x);
		}

		t.match(stdout, /6 tests passed/);
		t.end();
	});
});

test('snapshots resolved location from "snapshotDir" in AVA config', t => {
	t.plan(8);
	const relativeFixtureDir = 'fixture/snapshots/test-snapshot-location';
	const snapDir = 'snapshot-fixtures';
	const snapDirStructure = [
		'src',
		'src/feature',
		'src/feature/nested-feature',
	];
	const snapFixtureFilePaths = snapDirStructure
		.flatMap(snapRelativeDir => {
			const snapPath = path.join(__dirname, '..', relativeFixtureDir, snapDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.cjs.md'),
				path.join(snapPath, 'test.cjs.snap'),
			];
		});
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};

	for (const x of snapFixtureFilePaths) {
		removeExistingSnapFixtureFiles(x);
	}

	const verifySnapFixtureFiles = relFilePath => {
		t.ok(fs.existsSync(relFilePath));
	};

	execCli([], {dirname: relativeFixtureDir, env: {AVA_FORCE_CI: 'not-ci'}}, (error, stdout) => {
		t.error(error);
		for (const x of snapFixtureFilePaths) {
			verifySnapFixtureFiles(x);
		}

		t.match(stdout, /6 tests passed/);
		t.end();
	});
});

test('snapshots are identical on different platforms', t => {
	const fixtureDir = path.join(__dirname, '..', 'fixture', 'snapshots', 'test-content');
	const reportPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.cjs.md');
	const snapPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.cjs.snap');
	const expectedReportPath = path.join(fixtureDir, 'test.cjs.md.expected');
	const expectedSnapPath = path.join(fixtureDir, 'test.cjs.snap.expected');

	const removeFile = filePath => {
		try {
			fs.unlinkSync(filePath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};

	// Clear current snapshots
	for (const fp of [reportPath, snapPath]) {
		removeFile(fp);
	}

	// Test should pass, and a snapshot gets written
	execCli(['--update-snapshots'], {dirname: fixtureDir, env: {AVA_FORCE_CI: 'not-ci'}}, error => {
		t.error(error);
		t.ok(fs.existsSync(reportPath));
		t.ok(fs.existsSync(snapPath));

		const reportContents = fs.readFileSync(reportPath);
		const snapContents = fs.readFileSync(snapPath);
		const expectedReportContents = fs.readFileSync(expectedReportPath);
		const expectedSnapContents = fs.readFileSync(expectedSnapPath);

		t.ok(reportContents.equals(expectedReportContents), 'report file contents matches snapshot');
		t.ok(snapContents.equals(expectedSnapContents), 'snap file contents matches snapshot');
		t.end();
	});
});

test('in CI, new snapshots are not recorded', t => {
	const fixtureDir = path.join(__dirname, '..', 'fixture', 'snapshots', 'test-content');
	const reportPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.cjs.md');
	const snapPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.cjs.snap');

	const removeFile = filePath => {
		try {
			fs.unlinkSync(filePath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};

	// Clear current snapshots
	for (const fp of [reportPath, snapPath]) {
		removeFile(fp);
	}

	// Test should fail, no snapshot gets written
	execCli([], {dirname: fixtureDir}, (_, stdout) => {
		t.match(stdout, 'No snapshot available — new snapshots are not created in CI environments');
		t.notOk(fs.existsSync(reportPath));
		t.notOk(fs.existsSync(snapPath));
		t.end();
	});
});
