import {expectError} from 'tsd';
import {IsAssertion, NotAssertion, DeepEqualAssertion, NotDeepEqualAssertion} from '..';

declare const is: IsAssertion;
declare const not: NotAssertion;
declare const deepEqual: DeepEqualAssertion;
declare const notDeepEqual: NotDeepEqualAssertion;

declare const literalStringUnionValue: 'hello' | 'world';
declare const objectWithLiteralStringUnionValue: {foo: 'hello' | 'world'};

// See #2575 and https://github.com/microsoft/TypeScript/issues/40377
expectError(is(literalStringUnionValue, 'another-string'));
expectError(not(literalStringUnionValue, 'another-string'));
expectError(deepEqual(objectWithLiteralStringUnionValue, {foo: 'another-string'}));
expectError(notDeepEqual(objectWithLiteralStringUnionValue, {foo: 'another-string'}));
