export default function trimOffNewlines(text) {
	return text.replace(/^[\r\n]+|[\r\n]+$/g, '');
}
