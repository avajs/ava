import test from '../../../';

test(t => {
	Promise.resolve().then(function outer() {
    return Promise.resolve().then(function inner() {
        return Promise.resolve().then(function evenMoreInner() {
					a.b.c.d()
        }).catch(function catcher(e) {
					t.throws(throwSync());
        });
    });
	});
});


function throwSync() {
	throw new Error('Test String');
}
