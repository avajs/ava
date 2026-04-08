export {
	setTimeout,
	clearTimeout,
	setImmediate,
	setInterval,
	clearInterval,
	clearImmediate,
} from 'node:timers';

export const {now} = Date;

// Any delay larger than this value is ignored by Node.js, with a delay of `1`
// used instead. See <https://nodejs.org/api/timers.html#settimeoutcallback-delay-args>.
const MAX_DELAY = (2 ** 31) - 1;

export function setCappedTimeout(callback, delay) {
	const safeDelay = Math.min(delay, MAX_DELAY);
	return globalThis.setTimeout(callback, safeDelay);
}
