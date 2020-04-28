const test = require('../../../..');
const util = require('util');

util.inspect.defaultOptions.depth = 4;

test('format with max depth 4', t => {
	const exp = {
		a: {
			b: {
				foo: 'bar'
			}
		}
	};
	const act = {
		a: {
			b: {
				foo: 'bar'
			}
		},
		c: {
			d: {
				e: {
					foo: 'bar'
				}
			}
		}
	};
	t.deepEqual(exp, act);
});
