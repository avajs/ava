export let receivedArgs = null; // eslint-disable-line import/no-mutable-exports

export default function (...args) {
	receivedArgs = args;
}
