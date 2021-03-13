const test = require(process.env.AVA_PATH); // This fixture is copied to a temporary directory, so require AVA through its configured path.

test(`a ${process.env.TEMPLATE ? '' : 'new '}title`, t => {
	t.snapshot({foo: 'one'});
});
