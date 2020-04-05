'use strict';

module.exports = {
	all: true,
	exclude: [
		'{coverage,media,test-d,test-tap}/**',
		'*.config.js'
	],
	reporter: [
		'html',
		'lcov',
		'text'
	]
};
