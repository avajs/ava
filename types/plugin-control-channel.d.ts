// Internal to AVA, not for plugin authors and not exported from any entrypoint. The messages that the host and
// the plugin loader exchange over one MessagePort per plugin. The loader implements `negotiateProtocol()` and
// `observe()` on top of them. See worklog/plugin-protocol.md.
import type {Plugin} from './plugin-protocol.js';

export type HostMessage = {
	/**
	Asks the plugin to configure itself, once AVA has chosen a protocol and parsed argv.
	*/
	readonly type: 'configure';
	/**
	Identifies the request, so the `configured` or `error` reply can be matched to it.
	*/
	readonly id: number;
	/**
	What the plugin needs to know to configure itself.
	*/
	readonly context: Plugin.ConfigureContext;
} | {
	/**
	Configuration and stdout claims have been validated for every plugin. Allows an active plugin's
	negotiateProtocol() call to resolve.
	*/
	readonly type: 'activate';
} | {
	/**
	Confirms an inactive configure result. The loader rejects negotiation only after the host has recorded
	inactivity, so a quiet thread exit cannot race ahead of its configuration reply.
	*/
	readonly type: 'deactivate';
} | {
	/**
	Rejects pending negotiation after a host-side startup failure, allowing the plugin's finally cleanup
	to run before its thread is terminated.
	*/
	readonly type: 'reject';
	readonly error: {
		readonly message: string;
		readonly name: string;
		readonly stack: string;
	};
} | {
	/**
	Asks the plugin to stop immediately, e.g. after an acknowledgement timeout.
	*/
	readonly type: 'terminate';
};

export type PluginMessage = {
	/**
	Sent when the plugin calls `negotiateProtocol()`. AVA picks the first supported identifier it knows, or fails
	startup. It then parses argv using `flags`, and sends `configure`.
	*/
	readonly type: 'negotiate';
	/**
	The identifiers the plugin can speak, in order of preference.
	*/
	readonly supported: readonly Plugin.ProtocolIdentifier[];
	/**
	See `Plugin.Plugin.version`.
	*/
	readonly version: string;
	/**
	See `Plugin.Plugin.capabilities`.
	*/
	readonly capabilities: readonly Plugin.Capability[];
	/**
	See `Plugin.Plugin.namespace`.
	*/
	readonly namespace: string;
	/**
	See `Plugin.Plugin.flags`.
	*/
	readonly flags: Readonly<Record<string, Plugin.FlagDefinition>>;
} | {
	/**
	The reply to a successful `configure` request.
	*/
	readonly type: 'configured';
	/**
	The `id` of the request.
	*/
	readonly id: number;
	/**
	What `configure()` returned.
	*/
	readonly result: Plugin.ConfigureResult;
} | {
	/**
	Sent by the loader when the plugin first calls `observe()`, after it has subscribed to the broadcast channel. AVA
	emits nothing until every active plugin has sent this.
	*/
	readonly type: 'ready';
} | {
	/**
	Sent by the loader for a message with `sync: true`, once every running `observe()` handler has finished handling
	it: when it requested the next message, or for `end-of-stream` when the handler returned. Handlers that return
	early no longer hold up acknowledgements.
	*/
	readonly type: 'ack';
	/**
	The `seq` of the message that is acknowledged.
	*/
	readonly seq: number;
} | {
	/**
	An error in `configure()` or the `observe()` handler, or an unhandled rejection in the plugin thread.
	*/
	readonly type: 'error';
	/**
	The `id` of the request, if the error is the reply to one.
	*/
	readonly id?: number;
	/**
	The error, in a form that can cross the thread boundary.
	*/
	readonly error: {
		readonly message: string;
		readonly name: string;
		readonly stack: string;
	};
};
