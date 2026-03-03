/* eslint-disable @typescript-eslint/no-empty-function */
import anyTest from '../../entrypoints/main.mjs';

anyTest.skipIf(true).beforeEach(() => {});
anyTest.runIf(false).afterEach(() => {});
anyTest.skipIf(true).serial.before(() => {});
anyTest.serial.runIf(true).after(() => {});

anyTest.skipIf(true).todo('skipIf todo should be allowed');
anyTest.runIf(false).todo('runIf todo should be allowed');
anyTest.skipIf(true).serial.todo('skipIf serial todo should be allowed');
anyTest.runIf(false).serial.todo('runIf serial todo should be allowed');
anyTest.serial.skipIf(true).todo('serial skipIf todo should be allowed');
anyTest.serial.runIf(false).todo('serial runIf todo should be allowed');
