import test from '../../../..';
import dependency from './source.custom-ext';

test('works', t => {
	t.truthy(dependency);
});
