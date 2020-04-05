import {expectType} from 'tsd';
import test, {ForkableTestInterface, ForkableSerialInterface} from '../experimental';

const foo = test.make();
expectType<ForkableTestInterface>(foo);

const bar = foo.fork();
expectType<ForkableTestInterface>(bar);

const baz = foo.serial.fork();
expectType<ForkableSerialInterface>(baz);
const thud = baz.fork();
expectType<ForkableSerialInterface>(thud);
