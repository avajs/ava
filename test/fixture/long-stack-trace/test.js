import test from '../../../';
import Bluebird from './_enable-trace';

// This promise throwing pattern was used in bluebird documentation for long stack traces
// http://bluebirdjs.com/docs/api/promise.longstacktraces.html
test(async t => {
	await Bluebird.resolve().then(() => {
		return Bluebird.resolve().then(() => {
			return Bluebird.resolve().then(() => {
				a.b.c.d(); // eslint-disable-line no-undef
			});
		});
	}).catch(err => console.error(err.stack));
	t.fail();
});
