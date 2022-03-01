export default {
	files: ['*.cjs'],
	// Descending order
	sortTestFiles: (a, b) => b.localeCompare(a, [], {numeric: true}),
};
