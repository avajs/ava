import test from '../../../../';

// This should never be loaded - package.json overrides files to call `actual.js`

test(t => {
	t.fail();
});
