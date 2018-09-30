'use strict';
const fs = require('fs');
const path = require('path');
const execa = require('execa');
const uniqueTempDir = require('unique-temp-dir');
const test = require('tap').test;
const {execCli} = require('../helper/cli');

for (const obj of [
	{type: 'colocated', rel: '', dir: ''},
	{type: '__tests__', rel: '__tests__-dir', dir: '__tests__/__snapshots__'},
	{type: 'test', rel: 'test-dir', dir: 'test/snapshots'},
	{type: 'tests', rel: 'tests-dir', dir: 'tests/snapshots'}
]) {
	test(`snapshots work (${obj.type})`, t => {
		const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', obj.rel, obj.dir, 'test.js.snap');
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}

		const dirname = path.join('fixture/snapshots', obj.rel);
		// Test should pass, and a snapshot gets written
		execCli(['--update-snapshots'], {dirname}, error => {
			t.ifError(error);
			t.true(fs.existsSync(snapPath));

			// Test should pass, and the snapshot gets used
			execCli([], {dirname}, error => {
				t.ifError(error);
				t.end();
			});
		});
	});
}

test('appends to existing snapshots', t => {
	const cliPath = require.resolve('../../cli.js');
	const avaPath = require.resolve('../../');

	const cwd = uniqueTempDir({create: true});
	fs.writeFileSync(path.join(cwd, 'package.json'), '{}');

	const initial = `import test from ${JSON.stringify(avaPath)}
test('one', t => {
	t.snapshot({one: true})
})`;
	fs.writeFileSync(path.join(cwd, 'test.js'), initial);

	const run = () => execa(process.execPath, [cliPath, '--verbose', '--no-color'], {cwd, env: {CI: '1'}, reject: false});
	return run().then(result => {
		t.match(result.stdout, /1 test passed/);

		fs.writeFileSync(path.join(cwd, 'test.js'), `${initial}
test('two', t => {
	t.snapshot({two: true})
})`);
		return run();
	}).then(result => {
		t.match(result.stdout, /2 tests passed/);

		fs.writeFileSync(path.join(cwd, 'test.js'), `${initial}
test('two', t => {
	t.snapshot({two: false})
})`);

		return run();
	}).then(result => {
		t.match(result.stdout, /1 test failed/);
	});
});

test('outdated snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x00, 0x00]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is v0, but only v2 is supported\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('newer snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0xFF, 0xFF]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is v65535, but only v2 is supported\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /You should upgrade AVA\./);
		t.end();
	});
});

test('snapshot corruption is reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x02, 0x00]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file is corrupted\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to recreate it\./);
		t.end();
	});
});

test('legacy snapshot files are reported to the console', t => {
	const snapPath = path.join(__dirname, '..', 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from('// Jest Snapshot v1, https://goo.gl/fbAQLP\n'));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (error, stdout) => {
		t.ok(error);
		t.match(stdout, /The snapshot file was created with AVA 0\.19\. It's not supported by this AVA version\./);
		t.match(stdout, /File path:/);
		t.match(stdout, snapPath);
		t.match(stdout, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('snapshots infer their location from sourcemaps', t => {
	t.plan(8);
	const relativeFixtureDir = path.join('fixture/snapshots/test-sourcemaps');
	const snapDirStructure = [
		'src',
		'src/test/snapshots',
		'src/feature/__tests__/__snapshots__'
	];
	const snapFixtureFilePaths = snapDirStructure
		.map(snapRelativeDir => {
			const snapPath = path.join(__dirname, '..', relativeFixtureDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.js.md'),
				path.join(snapPath, 'test.js.snap')
			];
		})
		.reduce((a, b) => a.concat(b), []);
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};
	snapFixtureFilePaths.forEach(x => removeExistingSnapFixtureFiles(x));
	const verifySnapFixtureFiles = relFilePath => {
		t.true(fs.existsSync(relFilePath));
	};
	execCli([], {dirname: relativeFixtureDir}, (error, stdout) => {
		t.ifError(error);
		snapFixtureFilePaths.forEach(x => verifySnapFixtureFiles(x));
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
		'src/feature/nested-feature'
	];
	const snapFixtureFilePaths = snapDirStructure
		.map(snapRelativeDir => {
			const snapPath = path.join(__dirname, '..', relativeFixtureDir, snapDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.js.md'),
				path.join(snapPath, 'test.js.snap')
			];
		})
		.reduce((a, b) => a.concat(b), []);
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	};
	snapFixtureFilePaths.forEach(x => removeExistingSnapFixtureFiles(x));
	const verifySnapFixtureFiles = relFilePath => {
		t.true(fs.existsSync(relFilePath));
	};
	execCli([], {dirname: relativeFixtureDir}, (error, stdout) => {
		t.ifError(error);
		snapFixtureFilePaths.forEach(x => verifySnapFixtureFiles(x));
		t.match(stdout, /6 tests passed/);
		t.end();
	});
});

test('snapshots are indentical on different platforms', t => {
	const fixtureDir = path.join(__dirname, '..', 'fixture', 'snapshots', 'test-content');
	const reportPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.js.md');
	const snapPath = path.join(fixtureDir, 'tests', 'snapshots', 'test.js.snap');
	const expectedReportPath = path.join(fixtureDir, 'test.js.md.expected');
	const expectedSnapPath = path.join(fixtureDir, 'test.js.snap.expected');

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
	[reportPath, snapPath].forEach(fp => removeFile(fp));

	// Test should pass, and a snapshot gets written
	execCli(['--update-snapshots'], {dirname: fixtureDir}, error => {
		t.ifError(error);
		t.true(fs.existsSync(reportPath));
		t.true(fs.existsSync(snapPath));

		const reportContents = fs.readFileSync(reportPath);
		const snapContents = fs.readFileSync(snapPath);
		const expectedReportContents = fs.readFileSync(expectedReportPath);
		const expectedSnapContents = fs.readFileSync(expectedSnapPath);

		t.true(reportContents.equals(expectedReportContents), 'report file contents matches snapshot');
		t.true(snapContents.equals(expectedSnapContents), 'snap file contents matches snapshot');
		t.end();
	});
});
