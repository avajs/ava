export default function trimOffNewlines(text) {
	const regex = '/^[\r\n]+|[\r\n]+$/g';
	return text.replace(regex, '');
}
