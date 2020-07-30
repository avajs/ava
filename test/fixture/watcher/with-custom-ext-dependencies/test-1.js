import test from '../../../..';
import dependency from './source.custom-ext'; // eslint-disable-line import/extensions

test('works', t => {
	t.truthy(dependency);
});
