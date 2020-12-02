export namespace SharedWorker {
	export type ProtocolIdentifier = 'experimental';

	export type FactoryOptions = {
		negotiateProtocol <Data = unknown>(supported: readonly ['experimental']): Experimental.Protocol<Data>;
		// Add overloads for additional protocols.
	};

	export type Factory = (options: FactoryOptions) => void;

	export namespace Experimental {
		export type Protocol<Data = unknown> = {
			readonly initialData: Data;
			readonly protocol: 'experimental';
			broadcast: (data: Data) => BroadcastMessage<Data>;
			ready: () => Protocol<Data>;
			subscribe: () => AsyncIterableIterator<ReceivedMessage<Data>>;
			testWorkers: () => AsyncIterableIterator<TestWorker<Data>>;
		};

		export type BroadcastMessage<Data = unknown> = {
			readonly id: string;
			replies: () => AsyncIterableIterator<ReceivedMessage<Data>>;
		};

		export type PublishedMessage<Data = unknown> = {
			readonly id: string;
			replies: () => AsyncIterableIterator<ReceivedMessage<Data>>;
		};

		export type ReceivedMessage<Data = unknown> = {
			readonly data: Data;
			readonly id: string;
			readonly testWorker: TestWorker;
			reply: (data: Data) => PublishedMessage<Data>;
		};

		export type TestWorker<Data = unknown> = {
			readonly id: string;
			readonly file: string;
			publish: (data: Data) => PublishedMessage<Data>;
			subscribe: () => AsyncIterableIterator<ReceivedMessage<Data>>;
			teardown: <TeardownFn extends () => void> (fn: TeardownFn) => TeardownFn;
		};
	}

	export namespace Plugin {
		export type RegistrationOptions<Identifier extends ProtocolIdentifier, Data = unknown> = {
			readonly filename: string;
			readonly initialData?: Data;
			readonly supportedProtocols: readonly Identifier[];
			readonly teardown?: () => void;
		};

		export namespace Experimental {
			export type Protocol<Data = unknown> = {
				readonly available: Promise<void>;
				readonly currentlyAvailable: boolean;
				readonly protocol: 'experimental';
				publish: (data: Data) => PublishedMessage<Data>;
				subscribe: () => AsyncIterableIterator<ReceivedMessage<Data>>;
			};

			export type PublishedMessage<Data = unknown> = {
				readonly id: string;
				replies: () => AsyncIterableIterator<ReceivedMessage<Data>>;
			};

			export type ReceivedMessage<Data = unknown> = {
				readonly data: Data;
				readonly id: string;
				reply: (data: Data) => PublishedMessage<Data>;
			};
		}
	}
}

export function registerSharedWorker<Data = unknown>(options: SharedWorker.Plugin.RegistrationOptions<'experimental', Data>): SharedWorker.Plugin.Experimental.Protocol<Data>;
// Add overloads for additional protocols.
