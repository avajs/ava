# Testing React components

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/react.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/react.md)

## Setting up Babel

The first step is setting up Babel to transpile JSX code from the tests by adding an AVA section to your package.json:

```json
{
	"ava": {
		"require": ["babel-register"],
		"babel": "inherit"
	},
	"babel": {
		"presets": ["react"]
	}
}
```

You can find more information about setting up Babel with AVA in the [babelrc recipe](babelrc.md).

## Using [Enzyme](https://github.com/airbnb/enzyme)

Let's first see how to use AVA with one of the most popular React testing libraries: [Enzyme](https://github.com/airbnb/enzyme).

If you intend to only use [shallow component rendering](https://facebook.github.io/react/docs/test-utils.html#shallow-rendering), you don't need any extra setup.

First install [Enzyme required packages](https://github.com/airbnb/enzyme/#installation):

```console
$ npm install --save-dev enzyme react-addons-test-utils react-dom
```

Then you can use Enzyme straight away:

```js
import test from 'ava';
import React from 'react';
import {shallow} from 'enzyme';

const Foo = ({children}) =>
	<div className="Foo">
		<span className="bar">bar</span>
		{children}
		<span className="bar">bar</span>
	</div>;

Foo.propTypes = {
	children: React.PropTypes.any
};

test('has a .Foo class name', t => {
	const wrapper = shallow(<Foo/>);
	t.true(wrapper.hasClass('Foo'));
});

test('renders two `.Bar`', t => {
	const wrapper = shallow(<Foo/>);
	t.is(wrapper.find('.bar').length, 2);
});

test('renders children when passed in', t => {
	const wrapper = shallow(
		<Foo>
			<div className="unique"/>
		</Foo>
	);
	t.true(wrapper.contains(<div className="unique"/>));
});
```

Enzyme also has a `mount` and `render` helper to test in an actual browser environment. If you want to use these helpers, you will have to setup a browser environment. Check out the [browser testing recipe](https://github.com/avajs/ava/blob/master/docs/recipes/browser-testing.md) on how to do so.

To see an example of AVA working together with Enzyme set up for browser testing, have a look at [this sample project](https://github.com/adriantoine/ava-enzyme-demo).

This is a basic example on how to integrate Enzyme with AVA. For more information about using Enzyme for unit testing React component, have a look at [Enzyme's documentation](http://airbnb.io/enzyme/).

## Using JSX helpers

Another approach to testing React component is to use the [`react-element-to-jsx-string`](https://github.com/algolia/react-element-to-jsx-string) package to compare DOM trees as strings. [`jsx-test-helpers`](https://github.com/MoOx/jsx-test-helpers) is a nice library handling [shallow component rendering](https://facebook.github.io/react/docs/test-utils.html#shallow-rendering) and converting JSX to string in order to test React components using AVA assertions.

```console
$ npm install --save-dev jsx-test-helpers
```

Usage example:

```js
import test from 'ava';
import React from 'react';
import {renderJSX, JSX} from 'jsx-test-helpers';

const Foo = ({children}) =>
	<div className="Foo">
		<span className="bar">bar</span>
		{children}
		<span className="bar">bar</span>
	</div>;

Foo.propTypes = {
	children: React.PropTypes.any
};

test('renders correct markup', t => {
	const actual = renderJSX(<Foo/>);
	const expected = JSX(
		<div className="Foo">
			<span className="bar">bar</span>
			<span className="bar">bar</span>
		</div>
	);
	t.is(actual, expected);
});

test('renders children when passed in', t => {
	const actual = renderJSX(
		<Foo>
			<div className="unique"/>
		</Foo>
	);
	const expected = JSX(
		<div className="Foo">
			<span className="bar">bar</span>
			<div className="unique"/>
			<span className="bar">bar</span>
		</div>
	);
	t.is(actual, expected);
});
```

Note that you have to use variables like `actual` and `expected` because [`power-assert` doesn't handle JSX correctly](https://github.com/power-assert-js/power-assert/issues/34).

This is a basic example on how to use `jsx-test-helpers` with AVA. To see a more advanced usage of this library, have a look at [this annotated test file](https://github.com/MoOx/jsx-test-helpers/blob/master/src/__tests__/index.js).

[This sample project](https://github.com/MoOx/jsx-test-helpers) shows a basic and minimal setup of AVA with `jsx-test-helpers`.

## Using other assertion libraries

In AVA, you can use any assertion library, and there are already a few out there to test React components. Here is a list of assertion libraries working well with AVA:

- [`expect-jsx`](https://github.com/algolia/expect-jsx) ([Example](https://github.com/avajs/ava/issues/186#issuecomment-161317068))
- [`unexpected-react`](https://github.com/bruderstein/unexpected-react) ([Sample project with an output example](https://github.com/adriantoine/ava-unexpected-react-demo))
