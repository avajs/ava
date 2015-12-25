import test from '../../';

var arrowFunction = foo => "bar";

var arrowFunctionRaw = 'foo => "bar"';

test(function (t) {
	console.log('gen:', arrowFunction.toString());
	if (['0.10.', '0.11.', '0.12.'].indexOf(process.versions.node.slice(0, 5)) === -1) {
		t.is(arrowFunction.toString(), arrowFunctionRaw);
	} else {
		t.not(arrowFunction.toString(), arrowFunctionRaw);
	}
});
