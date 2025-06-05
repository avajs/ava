import test from 'ava';
import {fixture} from '../helpers/exec.js';

test('happy path', async t => {
    const result = await fixture(['happy-path.js']);

    // Ensure result.stats.passed is valid before mapping
    t.truthy(result.stats?.passed, 'No passed tests found');
    t.snapshot(result.stats.passed.map(({title}) => title));
});

test('throws requires native errors', async t => {
    const result = await t.throwsAsync(fixture(['throws.js']));

    // Ensure stats exist before mapping
    t.truthy(result.stats?.passed, 'No passed tests found');
    t.truthy(result.stats?.failed, 'No failed tests found');

    t.snapshot(result.stats.passed.map(({title}) => title), 'passed tests');
    t.snapshot(result.stats.failed.map(({title}) => title), 'failed tests');
});

test('throwsAsync requires native errors', async t => {
    const result = await t.throwsAsync(fixture(['throws-async.js']));

    t.truthy(result.stats?.passed, 'No passed tests found');
    t.truthy(result.stats?.failed, 'No failed tests found');

    t.snapshot(result.stats.passed.map(({title}) => title), 'passed tests');
    t.snapshot(result.stats.failed.map(({title}) => title), 'failed tests');
});
