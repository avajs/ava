import {expectType} from 'tsd';

import * as plugin from '../plugin'; // eslint-disable-line import/extensions

expectType<plugin.SharedWorker.Plugin.Experimental.Protocol>(plugin.registerSharedWorker({filename: '', supportedProtocols: ['experimental']}));

const factory: plugin.SharedWorker.Factory = ({negotiateProtocol}) => {
	expectType<plugin.SharedWorker.Experimental.Protocol>(negotiateProtocol(['experimental']));
};
