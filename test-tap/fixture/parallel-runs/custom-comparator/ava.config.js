export default {
	files: ['[0-9]*.js'],
	// Descending order
	sortTestFiles: (a, b) => b.localeCompare(a, [], {numeric: true}),
};
