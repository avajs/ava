type ErrorSource = {
	isDependency: boolean;
	isWithinProject: boolean;
	file: string;
	line: number;
};

type SerializedErrorBase = {
	message: string;
	name: string;
	originalError: unknown;
	stack: string;
};

type AggregateSerializedError = SerializedErrorBase & {
	type: 'aggregate';
	errors: SerializedError[];
};

type NativeSerializedError = SerializedErrorBase & {
	type: 'native';
	source: ErrorSource | undefined;
};

type AvaSerializedError = SerializedErrorBase & {
	type: 'ava';
	assertion: string;
	improperUsage: unknown | undefined;
	formattedCause: unknown | undefined;
	formattedDetails: unknown | unknown[];
	source: ErrorSource | undefined;
};

type SerializedError = AggregateSerializedError | NativeSerializedError | AvaSerializedError;

export type StateChangeEvent = {
	type: 'starting';
	testFile: string;
} | {
	type: 'stats';
	stats: {
		byFile: Map<string, {
			declaredTests: number;
			failedHooks: number;
			failedTests: number;
			internalErrors: number;
			remainingTests: number;
			passedKnownFailingTests: number;
			passedTests: number;
			selectedTests: number;
			selectingLines: boolean;
			skippedTests: number;
			todoTests: number;
			uncaughtExceptions: number;
			unhandledRejections: number;
		}>;
		declaredTests: number;
		failedHooks: number;
		failedTests: number;
		failedWorkers: number;
		files: number;
		parallelRuns: {
			currentIndex: number;
			totalRuns: number;
		} | undefined;
		finishedWorkers: number;
		internalErrors: number;
		remainingTests: number;
		passedKnownFailingTests: number;
		passedTests: number;
		selectedTests: number;
		sharedWorkerErrors: number;
		skippedTests: number;
		timedOutTests: number;
		timeouts: number;
		todoTests: number;
		uncaughtExceptions: number;
		unhandledRejections: number;
	};
} | {
	type: 'declared-test';
	title: string;
	knownFailing: boolean;
	todo: boolean;
	testFile: string;
} | {
	type: 'selected-test';
	title: string;
	knownFailing: boolean;
	skip: boolean;
	todo: boolean;
	testFile: string;
} | {
	type: 'test-register-log-reference';
	title: string;
	logs: string[];
	testFile: string;
} | {
	type: 'test-passed';
	title: string;
	duration: number;
	knownFailing: boolean;
	logs: string[];
	testFile: string;
} | {
	type: 'test-failed';
	title: string;
	err: SerializedError;
	duration: number;
	knownFailing: boolean;
	logs: string[];
	testFile: string;
} | {
	type: 'worker-finished';
	forcedExit: boolean;
	testFile: string;
} | {
	type: 'worker-failed';
	nonZeroExitCode?: boolean;
	signal?: string;
	err?: SerializedError;
} | {
	type: 'touched-files';
	files: {
		changedFiles: string[];
		temporaryFiles: string[];
	};
} | {
	type: 'worker-stdout';
	chunk: Uint8Array;
	testFile: string;
} | {
	type: 'worker-stderr';
	chunk: Uint8Array;
	testFile: string;
} | {
	type: 'timeout';
	period: number;
	pendingTests: Map<string, Set<string>>;
}
| {
	type: 'end';
};
