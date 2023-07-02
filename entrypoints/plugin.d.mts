import type {SharedWorker} from '../types/shared-worker.cjs';

export function registerSharedWorker<Data = unknown>(options: SharedWorker.Plugin.RegistrationOptions<'ava-4', Data>): SharedWorker.Plugin.Protocol<Data>;
// Add overloads for additional protocols.

export type {SharedWorker} from '../types/shared-worker.cjs';
