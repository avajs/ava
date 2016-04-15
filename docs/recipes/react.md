# Testing React components

## Setting up Babel

The first thing you need to do is to set up `babel` to transpile JSX code from the tests by adding an AVA section to your `package.json`:

```json
{
  "ava": {
    "require": ["babel-register"]
  },
  "babel": {
    "presets": ["react"]
  }
}
```

You can find more information about setting up `babel` with AVA in the [babelrc recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/babelrc.md).

## Using [Enzyme](https://github.com/airbnb/enzyme)

Let's first see how to use AVA with one of the most popular React testing libraries: [Enzyme](https://github.com/airbnb/enzyme).

If you only plan to use [shallow component rendering](https://facebook.github.io/react/docs/test-utils.html#shallow-rendering), you don't need any extra setup.

First install [Enzyme required packages](https://github.com/airbnb/enzyme/#installation):

```console
$ npm install --save-dev enzyme react-addons-test-utils react-dom
```

And you can use Enzyme straight away:

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

Enzyme also has a `mount` and `render` helper to test in an actual browser environment. If you want to use these helpers, you will have to setup a browser environment. Check out the [browser testing recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/browser-testing.md) on how to do so.

To see an example of AVA working together with Enzyme, set up for browser testing, have a look at [this sample project](https://github.com/adriantoine/ava-enzyme-demo).

This is a basic example about how to integrate Enzyme with AVA. For more information about using Enzyme for unit testing React component, have a look at [Enzyme's documentation](http://airbnb.io/enzyme/).

## Using JSX helpers

There is another approach to testing React component, which is to use the [`react-element-to-jsx-string`](https://github.com/algolia/react-element-to-jsx-string) package to compare DOM trees as strings, like [`expect-jsx`](https://github.com/algolia/expect-jsx). [You can use `expect-jsx` with AVA](https://github.com/sindresorhus/ava/issues/186#issuecomment-161317068) however it is nicer to use AVA assertions and only rely on helpers.

To do so you can use the [`jsx-test-helpers`](https://github.com/MoOx/jsx-test-helpers) library:

```console
$ npm install --save-dev jsx-test-helpers
```

And test your React components:

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

This is a basic example about how to use `jsx-test-helpers` with AVA, to see a more advanced usage of this library, please have a look at [this annotated test file](https://github.com/MoOx/jsx-test-helpers/blob/master/src/__tests__/index.js).

## Reference
- [In depth guide of setting up AVA with code coverage on a React project](https://github.com/kentcdodds/react-ava-workshop)
