import test from '../../../';
const Promise = require('./enable-trace.js');

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
