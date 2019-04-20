import test, {ExecutionContext, Macro} from '../..';

// Explicitly type as a macro.
{
	const hasLength: Macro<[string, number]> = (t, input, expected) => {
		t.is(input.length, expected);
	};

	test('bar has length 3', hasLength, 'bar', 3);
	test('bar has length 3', [hasLength], 'bar', 3);
}

// Infer macro
{
	const hasLength = (t: ExecutionContext, input: string, expected: number) => {
		t.is(input.length, expected);
	};

	test('bar has length 3', hasLength, 'bar', 3);
	test('bar has length 3', [hasLength], 'bar', 3);
}

// Multiple macros
{
	const hasLength = (t: ExecutionContext, input: string, expected: number) => {
		t.is(input.length, expected);
	};
	const hasCodePoints = (t: ExecutionContext, input: string, expected: number) => {
		t.is(Array.from(input).length, expected);
	};

	test('bar has length 3', [hasLength, hasCodePoints], 'bar', 3);
}

// No title
{
	const hasLength: Macro<[string, number]> = (t, input, expected) => {
		t.is(input.length, expected);
	};
	const hasCodePoints: Macro<[string, number]> = (t, input, expected) => {
		t.is(Array.from(input).length, expected);
	};

	test(hasLength, 'bar', 3);
	test([hasLength, hasCodePoints], 'bar', 3);
}

// No arguments
{
	const pass: Macro<[]> = t => t.pass()
	pass.title = () => 'pass'
	test(pass)
}

// Inline
{
	test('has length 3', (t: ExecutionContext, input: string, expected: number) => {
		t.is(input.length, expected)
	}, 'bar', 3)

	test((t: ExecutionContext, input: string, expected: number) => {
		t.is(input.length, expected)
	}, 'bar', 3)
}

// Completely infer parameters
{
	test('has length 3', (t, input, expected) => {
		t.is(input.length, expected);
	}, 'foo', 3);

	test((t, input, expected) => {
		t.is(input.length, expected)
	}, 'foo', 3);
}
