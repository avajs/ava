// Node patch releases can move internal source locations. Only normalize TAP's
// diagnostic `at` field; error messages, stack frames and user locations remain.
export default function normalizeNodeInternalLocations(output) {
	return output.replaceAll(/^ {2}-{3}\r?\n[\s\S]*?^ {2}\.{3}(?:\r?\n|$)/gm, diagnostic => diagnostic.replaceAll(
		/^( {4}at: ['"](?:[^'"\r\n()]*\()?node:internal\/[^'"\r\n():]+):\d+:\d+(\)?['"]\r?$)/gm,
		'$1$2',
	));
}
