const info = require('ci-info');

const {AVA_FORCE_CI} = process.env;

module.exports = AVA_FORCE_CI === 'not-ci' ? false : AVA_FORCE_CI === 'ci' || info.isCI;
