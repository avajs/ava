'use strict';
require('./guard-environment.cjs'); // eslint-disable-line import/no-unassigned-import

const runner = require('./base').getRunner();
module.exports = runner.chain;
