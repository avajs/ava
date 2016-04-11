# Testing React components

This recipe is giving guidelines to test React components.

## Setting up Babel

The first thing you need is to set up babel to transpile JSX code from the tests. To do that, I'll recommend the [babelrc recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/babelrc.md) using `babel-preset-react`.

## Enzyme

Let's see first how to implement how to use ava with one of the most popular React testing library: [enzyme](https://github.com/airbnb/enzyme).

If you only plan to use `shallow` component rendering, you don't need extra setup. First install `enzyme`:

```js
npm i --save-dev enzyme react-addons-test-utils react-dom
```

and you can use enzyme straight away (example from the enzyme readme):

```js
import test from 'ava';
import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import MyComponent from '../';
import Foo from '../../Foo';

test('renders three <Foo /> components', t => {
  const wrapper = shallow(<MyComponent />);
  t.is(wrapper.find(Foo).length, 3);
});

test('renders an `.icon-star`', t => {
  const wrapper = shallow(<MyComponent />);
  t.is(wrapper.find('.icon-star').length, 1);
});

test('renders children when passed in', t => {
  const wrapper = shallow(
    <MyComponent>
      <div className="unique" />
    </MyComponent>
  );
  t.truthy(wrapper.contains(<div className="unique" />);
});

test('simulates click events', t => {
  const onButtonClick = sinon.spy();
  const wrapper = shallow(
    <Foo onButtonClick={onButtonClick} />
  );
  wrapper.find('button').simulate('click');
  t.truthy(onButtonClick.calledOnce);
});
```

`enzyme` also has a `mount` and `render` helper to test in an actual browser environment, if you want to use these helpers, you will have to setup a browser environment, to do so, you should check out the [browser testing recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/browser-testing.md).

Here is a simple and minimal example of testing react components using `ava` and `enzyme` along with browser testing: https://github.com/adriantoine/ava-enzyme-demo

## Using JSX helpers

There is another approach to testing React component, which is to use the [`react-element-to-jsx-string`](https://github.com/algolia/react-element-to-jsx-string) package to compare DOM trees as strings, like [`expect-jsx`](https://github.com/algolia/expect-jsx). [You can use `expect-jsx` with ava](https://github.com/sindresorhus/ava/issues/186#issuecomment-161317068) however it is nicer to use ava assertions and only rely on helpers.

To do so you can use the [`jsx-test-helpers`](https://github.com/MoOx/jsx-test-helpers) library:

```js
npm i --save-dev jsx-test-helpers
```

and test your React components:
```js
import test from 'ava';
import React from 'react';
import { noop, renderJSX, JSX } from 'jsx-test-helpers';

import MyComponent from '../';
import Foo from '../../Foo';

test('renders three <Foo /> components', t => {
  const actual = renderJSX(<MyComponent />);
  const expected = JSX(
    <div onClick={ noop } className='MyComponent'>
      <span className='icon-star'/>
      <Foo/>
      <Foo/>
      <Foo/>
    </div>
  );
  t.is(actual, expected);
});
```

Note that you have to use variables like `actual` and `expected` because `power-assert` doesn't handle JSX correctly.

You can find annotated test file [here](https://github.com/MoOx/jsx-test-helpers/blob/master/src/__tests__/index.js) with more examples.
