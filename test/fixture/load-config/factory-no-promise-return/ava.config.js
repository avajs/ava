const factoryNoPromiseReturn = () => new Promise(resolve => {
	resolve({
		files: 'this-should-not-work'
	});
});

export default factoryNoPromiseReturn;
