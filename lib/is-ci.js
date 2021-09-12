import process from 'node:process';

import info from 'ci-info';

const {AVA_FORCE_CI} = process.env;

export default AVA_FORCE_CI === 'not-ci' ? false : AVA_FORCE_CI === 'ci' || info.isCI;
