
const config = new Promise((resolve, reject) => {
	resolve({
		files: 'this-should-not-work'
	})
})

module.exports = config
