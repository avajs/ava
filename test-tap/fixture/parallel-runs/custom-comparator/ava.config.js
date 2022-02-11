export default {
	files: ['*.cjs'],
	// Descending order
	ciParallelRunsComparator: (a, b) => b.localeCompare(a, [], {numeric: true}),
};
