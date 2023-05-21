import test from 'ava';
import {expect} from 'expect';

test('test', () => {
	expect(false).toBeTruthy();
});

test('test async', async () => {
	expect(false).toBeTruthy();
});
