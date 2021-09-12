/* eslint-disable ava/no-ignored-test-files */
import crypto from 'node:crypto';

import test from 'ava';

import plugin from './_plugin.js';

export default testFile => {
	test('becomes available', async t => {
		await t.notThrowsAsync(plugin.available);
	});

	test('replies', async t => {
		const expected1 = new Uint8Array(crypto.randomBytes(16));
		const expected2 = new Uint8Array(crypto.randomBytes(16));
		for await (const reply1 of plugin.publish(expected1).replies()) {
			t.deepEqual(reply1.data, expected1);
			for await (const reply2 of reply1.reply(expected2).replies()) { // eslint-disable-line no-unreachable-loop
				t.deepEqual(reply2.data, expected2);
				return;
			}
		}
	});

	test('broadcasts', async t => {
		for await (const message of plugin.subscribe()) {
			if ('broadcast' in message.data && message.data.broadcast === testFile) {
				const expected = new Uint8Array(crypto.randomBytes(16));
				for await (const reply of message.reply(expected).replies()) { // eslint-disable-line no-unreachable-loop
					t.deepEqual(reply.data, expected);
					return;
				}
			}
		}
	});

	test('workers are registered', async t => {
		for await (const message of plugin.subscribe()) {
			if ('hello' in message.data) {
				t.is(message.data.hello, testFile);
				const expected = new Uint8Array(crypto.randomBytes(16));
				for await (const reply of plugin.publish(expected).replies()) { // eslint-disable-line no-unreachable-loop
					t.deepEqual(reply.data, expected);
					break;
				}

				plugin.publish('👋');
			}

			if ('bye' in message.data && message.data.bye === testFile) {
				t.is(message.data.byeCount, 1);
				return;
			}
		}
	});
};
