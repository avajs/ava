import test from '../../../';
import Promise from './enable-trace';


// This promise throwing pattern was used in bluebird documentation for long stack traces
// http://bluebirdjs.com/docs/api/promise.longstacktraces.html
test(async t => {
	const resolve = await Promise.resolve().then(function outer() {
    return Promise.resolve().then(function inner() {
    	return Promise.resolve().then(function evenMoreInner() {
				a.b.c.d()
      }).catch(function catcher(e) {
				throw e.stack
      });
    });
	});
});
