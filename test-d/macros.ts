import {expectType} from 'tsd';
import test, {ExecutionContext, Macro} from '..'; // eslint-disable-line import/no-unresolved

// Explicitly type as a macro.
{
	const hasLength: Macro<[string, number]> = (t, input, expected) => {
		expectType<string>(input);
		expectType<number>(expected);
	};

	test('bar has length 3', hasLength, 'bar', 3);
	test('bar has length 3', [hasLength], 'bar', 3);
}

// Infer macro
{
	const hasLength = (t: ExecutionContext, input: string, expected: number) => {};

	test('bar has length 3', hasLength, 'bar', 3);
	test('bar has length 3', [hasLength], 'bar', 3);
}

// Multiple macros
{
	const hasLength = (t: ExecutionContext, input: string, expected: number) => {};
	const hasCodePoints = (t: ExecutionContext, input: string, expected: number) => {};

	test('bar has length 3', [hasLength, hasCodePoints], 'bar', 3);
}

// No title
{
	const hasLength: Macro<[string, number]> = (t, input, expected) => {};
	const hasCodePoints: Macro<[string, number]> = (t, input, expected) => {};

	test(hasLength, 'bar', 3);
	test([hasLength, hasCodePoints], 'bar', 3);
}

// No arguments
{
	const pass: Macro<[]> = (t, ...args) => { // eslint-disable-line @typescript-eslint/ban-types
		expectType<[]>(args); // eslint-disable-line @typescript-eslint/ban-types
	};

	pass.title = (providedTitle, ...args) => {
		expectType<string | undefined>(providedTitle);
		expectType<[]>(args); // eslint-disable-line @typescript-eslint/ban-types
		return '';
	};

	test(pass);
}

// Inline
test('has length 3', (t: ExecutionContext, input: string, expected: number) => {}, 'bar', 3);

test((t: ExecutionContext, input: string, expected: number) => {}, 'bar', 3);

// Completely infer parameters
test('has length 3', (t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
}, 'foo', 3);

test((t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
}, 'foo', 3);

test.skip((t, input, expected) => {
	expectType<string>(input);
	expectType<number>(expected);
}, 'foo', 3);
