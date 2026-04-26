import type {StateChangeEvent} from '../types/state-change-events.js';

export type Event = StateChangeEvent;

export type ObservedRun = {
	events: AsyncIterableIterator<Event>;
};
