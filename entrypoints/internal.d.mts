import type {StateChangeEvent} from '../types/state-change-events.d.cts';

export type RunEvent = {
	type: 'stateChange';
	stateChange: StateChangeEvent;
} | {
	type: 'run';
	plan: {
		bailWithoutReporting: boolean;
		debug: boolean;
		failFastEnabled: boolean;
		filePathPrefix: string;
		files: string[];
		matching: boolean;
		previousFailures: number;
		runOnlyExclusive: boolean;
		firstRun: boolean;
	};
};

export type {StateChangeEvent} from '../types/state-change-events.d.cts';

export type ObservedRun = {
	events: AsyncIterableIterator<RunEvent>;
};
