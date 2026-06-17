import {createRequire} from 'node:module';

// Concordance (and its lodash dependency) is expensive to evaluate, so it's loaded lazily on first use.
// Workers running passing simple assertions, plain `t.log` calls and snapshot-free files never touch it,
// and the main process only needs it to format the occasional non-native error.
const require = createRequire(import.meta.url);

let concordance;
export default function loadConcordance() {
	concordance ??= require('concordance');
	return concordance;
}
