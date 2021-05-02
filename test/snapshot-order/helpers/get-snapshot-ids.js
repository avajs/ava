export default function getSnapshotIds(report) {
	function * matchAll(string, regexp) {
		let match;
		while ((match = regexp.exec(string)) !== null) {
			yield match;
		}
	}

	const ids = [...matchAll(report, /'index: ([-.\d]+)'/g)].map(match => Number(match[1]));

	return ids;
}
