import type {StateChangeEvent} from '../types/state-change-events.d';

export type Event = StateChangeEvent;

export type ObservedRun = {
	events: AsyncIterableIterator<Event>;
};
