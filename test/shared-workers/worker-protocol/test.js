import test from 'ava';
import {fixture} from '../../helpers/exec.js';

test('shared worker plugins work', async t => {
    const result = await fixture();

    // Ensure refs is properly defined before accessing properties
    const refs = result?.refs || {};

    // Debugging: Log worker status before timeout
    setTimeout(() => {
        console.log('Worker status before timeout:', result?.worker);

        // Make sure refs.runnerChain is properly handled
        if (!refs.runnerChain) {
            console.error('Error: runnerChain is undefined or empty!');
        } else {
            console.log('Debug runnerChain:', refs.runnerChain);
        }

        // Assert only if runnerChain exists
        t.truthy(refs.runnerChain, 'runnerChain should not be undefined or empty');
    }, 5000);

    // Ensure stats exist before running assertions
    t.truthy(result?.stats?.passed, 'Worker plugins must return passed stats');
    t.snapshot(result?.stats?.passed);
});
