import process from 'node:process';
import {isMainThread} from 'node:worker_threads';

export const isRunningInThread = isMainThread === false;
export const isRunningInChildProcess = typeof process.send === 'function';
