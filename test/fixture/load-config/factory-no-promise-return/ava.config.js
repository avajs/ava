export default () => new Promise(resolve => {
	resolve({
		files: 'this-should-not-work'
	});
});
