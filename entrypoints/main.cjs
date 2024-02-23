'use strict';
module.exports = require('../lib/worker/main.cjs');

const {registerCompletionHandler} = require('../lib/worker/completion-handlers.cjs');

module.exports.registerCompletionHandler = registerCompletionHandler;
