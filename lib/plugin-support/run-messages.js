import {titlePrefix} from '../reporters/prefix-title.js';

const fieldsByEvent = {
	'selected-test': ['testFile', 'title', 'knownFailing', 'skip', 'todo'],
	'test-passed': ['testFile', 'title', 'duration', 'knownFailing', 'logs'],
	'test-failed': ['testFile', 'title', 'err', 'duration', 'knownFailing', 'logs'],
	'hook-finished': ['testFile', 'title', 'duration', 'logs'],
	'hook-failed': ['testFile', 'title', 'err', 'duration', 'logs'],
	'uncaught-exception': ['testFile', 'err'],
	'unhandled-rejection': ['testFile', 'err'],
	'missing-ava-import': ['testFile'],
	'process-exit': ['testFile', 'stack', 'pendingHooks', 'pendingTests'],
	timeout: ['period', 'pendingHooks', 'pendingTests'],
	'internal-error': ['testFile', 'err'],
	'worker-failed': ['testFile', 'nonZeroExitCode', 'signal', 'err'],
	'worker-finished': ['testFile', 'forcedExit'],
	'worker-stdout': ['testFile', 'chunk'],
	'worker-stderr': ['testFile', 'chunk'],
};

const totalFields = ['files', 'failedTests', 'remainingTests', 'passedTests', 'passedKnownFailingTests', 'skippedTests', 'todoTests', 'parallelRuns'];
const pick = (object, fields) => Object.fromEntries(fields.filter(field => Object.hasOwn(object, field)).map(field => [field, object[field]]));

export function runPlan(plan, extensions) {
	return {
		titlePrefixes: new Map(plan.files.length > 1
			? plan.files.map(file => [file, titlePrefix(extensions, plan.filePathPrefix, file)])
			: []),
	};
}

export function runEvent(event, plan) {
	if (!Object.hasOwn(fieldsByEvent, event.type)) {
		return undefined;
	}

	const result = {type: event.type, ...pick(event, fieldsByEvent[event.type])};
	if (event.type === 'worker-finished') {
		const {declaredTests, remainingTests} = plan.status.stats.byFile.get(event.testFile);
		Object.assign(result, {declaredTests, remainingTests, failFast: plan.failFastEnabled});
	}

	return result;
}

export function runEnd(plan, runId, reason, suggestedExitCode) {
	const totals = {...pick(plan.status.stats, totalFields), parallelRuns: plan.status.stats.parallelRuns ?? undefined};
	return {
		type: 'run-end', runId, reason, suggestedExitCode, totals,
	};
}
