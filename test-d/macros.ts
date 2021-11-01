/* eslint-disable no-lone-blocks, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
import {expectType} from 'tsd';

import test, {ExecutionContext} from '..';

// Typed arguments through generics.
{
	const hasLength = test.macro<[string, number]>((t, input, expected) => {
		expectType<string>(input);
		expectType<number>(expected);
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

{
	const hasLength = test.macro<[string, number]>({
		exec(t, input, expected) {
			expectType<string>(input);
			expectType<number>(expected);
		},
		title(providedTitle, input, expected) {
			expectType<string>(input);
			expectType<number>(expected);
			return 'title';
		},
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

// Typed arguments in execution function.
{
	const hasLength = test.macro((t, input: string, expected: number) => {});

	test('bar has length 3', hasLength, 'bar', 3);
}

{
	const hasLength = test.macro({
		exec(t, input: string, expected: number) {},
		title(providedTitle, input, expected) {
			expectType<string>(input);
			expectType<number>(expected);
			return 'title';
		},
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

// Untyped arguments
{
	const hasLength = test.macro((t, input, expected) => {
		expectType<unknown>(input);
		expectType<unknown>(expected);
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

// Usable without title, even if the macro lacks a title function.
{
	const hasLength = test.macro<[string, number]>((t, input, expected) => {});

	test(hasLength, 'bar', 3);
}

// No arguments
{
	const pass = test.macro<[]>({ // eslint-disable-line @typescript-eslint/ban-types
		exec(t, ...args) {
			expectType<[]>(args); // eslint-disable-line @typescript-eslint/ban-types
		},
		title(providedTitle, ...args) {
			expectType<string | undefined>(providedTitle);
			expectType<[]>(args); // eslint-disable-line @typescript-eslint/ban-types
			return '';
		},
	});

	test(pass);
}

// Inline function with explicit argument types.
test('has length 3', (t: ExecutionContext, input: string, expected: number) => {}, 'bar', 3);

// Completely inferred arguments for inline functions.
test('has length 3', (t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
}, 'foo', 3);

test.skip('skip', (t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
}, 'foo', 3);
