const skipTests = [];
if (process.versions.node < '12.14.0') {
	skipTests.push('!test/configurable-module-format/module.js');
}

export default {
	files: ['test/**', '!test/**/{fixtures,helpers}/**', ...skipTests],
	ignoredByWatcher: ['{coverage,docs,media,test-d,test-tap}/**']
};
