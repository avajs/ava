const config = new Promise(resolve => {
	resolve({
		files: 'this-should-not-work'
	});
});

module.exports = config;
