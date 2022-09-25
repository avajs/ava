/* eslint-disable no-lone-blocks */
import test, {ExecutionContext} from 'ava';
import {expectType} from 'tsd';

// Typed arguments through generics.
{
	const hasLength = test.macro<[string, number]>((t, input, expected) => {
		expectType<string>(input);
		expectType<number>(expected);
		// @ts-expect-error TS2345
		t.is(input, expected);
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

{
	const hasLength = test.macro<[string, number]>({
		exec(t, input, expected) {
			expectType<string>(input);
			expectType<number>(expected);
			// @ts-expect-error TS2345
			t.is(input, expected);
		},
		title(_providedTitle, input, expected) {
			expectType<string>(input);
			expectType<number>(expected);
			return 'title';
		},
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

// Typed arguments in execution function.
{
	const hasLength = test.macro((t, input: string, expected: number) => {
		// @ts-expect-error TS2345
		t.is(input, expected);
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

{
	const hasLength = test.macro({
		exec(t, input: string, expected: number) {
			// @ts-expect-error TS2345
			t.is(input, expected);
		},
		title(_providedTitle, input: string, expected: number) {
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
		t.is(input, expected);
	});

	test('bar has length 3', hasLength, 'bar', 3);
}

// Usable without title, even if the macro lacks a title function.
{
	const hasLength = test.macro<[string, number]>((t, input, expected) => {
		// @ts-expect-error TS2345
		t.is(input, expected);
	});

	test(hasLength, 'bar', 3);
}

// No arguments
{
	const pass = test.macro<[]>({ // eslint-disable-line @typescript-eslint/ban-types
		exec(_t, ...args) {
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

// Without test.macro()
{
	const hasLength = (t: ExecutionContext, input: string, expected: number) => {
		t.is(input.length, expected);
	};

	test('bar has length 3', hasLength, 'bar', 3);
}

// Inline function with explicit argument types.
test('has length 3', (t: ExecutionContext, input: string, expected: number) => {
	// @ts-expect-error TS2345
	t.is(input, expected);
}, 'bar', 3);

// Completely inferred arguments for inline functions.
test('has length 3', (t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
	// @ts-expect-error TS2345
	t.is(input, expected);
}, 'foo', 3);

test.skip('skip', (t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
	// @ts-expect-error TS2345
	t.is(input, expected);
}, 'foo', 3);
