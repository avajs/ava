import {expectError} from 'tsd';
import {IsAssertion} from '..';

declare const is: IsAssertion;

declare function getLiteralStringUnion(): 'hello' | 'world';

// See #2575 and https://github.com/microsoft/TypeScript/issues/40377
expectError(is(getLiteralStringUnion(), 'another-string'));
