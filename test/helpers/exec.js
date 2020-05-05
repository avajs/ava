const path = require('path');
const v8 = require('v8');

const test = require('@ava/test');
const execa = require('execa');

const cliPath = path.resolve(__dirname, '../../cli.js');
const serialization = process.versions.node >= '12.16.0' ? 'advanced' : 'json';

exports.fixture = async (...args) => {
	const cwd = path.join(path.dirname(test.meta.file), 'fixtures');
	const running = execa.node(cliPath, args, {
		env: {
			AVA_EMIT_RUN_STATUS_OVER_IPC: 'I\'ll find a payphone baby / Take some time to talk to you'
		},
		cwd,
		serialization
	});

	const stats = {
		passed: []
	};

	running.on('message', message => {
		if (serialization === 'json') {
			message = v8.deserialize(Uint8Array.from(message));
		}

		switch (message.type) {
			case 'test-passed': {
				const {title, testFile} = message;
				stats.passed.push({title, file: path.posix.relative(cwd, testFile)});
				break;
			}

			default:
				break;
		}
	});

	try {
		return {
			stats,
			...await running
		};
	} catch (error) {
		throw Object.assign(error, {stats});
	} finally {
		stats.passed.sort((a, b) => {
			if (a.file < b.file) {
				return -1;
			}

			if (a.file > b.file) {
				return 1;
			}

			if (a.title < b.title) {
				return -1;
			}

			return 1;
		});
	}
};
