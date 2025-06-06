export let receivedArgs = null; // eslint-disable-line import-x/no-mutable-exports

export default function (...args) {
	receivedArgs = args;
}
