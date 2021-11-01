import {expectType} from 'tsd';

import * as plugin from '../plugin'; // eslint-disable-line import/extensions

expectType<plugin.SharedWorker.Plugin.Protocol>(plugin.registerSharedWorker({filename: '', supportedProtocols: ['ava-4']}));

const factory: plugin.SharedWorker.Factory = ({negotiateProtocol}) => { // eslint-disable-line @typescript-eslint/no-unused-vars
	expectType<plugin.SharedWorker.Protocol>(negotiateProtocol(['ava-4']));
};
