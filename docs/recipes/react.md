# Testing React components

## Setting up Babel

The first thing you need to do is to set up `babel` to transpile JSX code from the tests. To do that, I'd recommend the [babelrc recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/babelrc.md) using [`babel-preset-react`](http://babeljs.io/docs/plugins/preset-react/). You can also have a look at this [sample project config](https://github.com/adriantoine/ava-enzyme-demo)

## Using [Enzyme](https://github.com/airbnb/enzyme/)

Let's first see how to use AVA with one of the most popular React testing libraries: [Enzyme](https://github.com/airbnb/enzyme).

If you only plan to use `shallow` component rendering, you don't need any extra setup.

First install [Enzyme required packages](https://github.com/airbnb/enzyme/#installation):

```
npm install --save-dev enzyme react-addons-test-utils react-dom
```

and you can use Enzyme straight away:

```js
import test from 'ava';
import React from 'react';
import {shallow} from 'enzyme';
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
      <div className='unique' />
    </MyComponent>
  );
  t.true(wrapper.contains(<div className='unique' />));
});

test('simulates click events', t => {
  t.plan(1);
  const wrapper = shallow(
    <Foo onButtonClick={() => t.pass()} />
  );
  wrapper.find('button').simulate('click');
});
```

Enzyme also has a `mount` and `render` helper to test in an actual browser environment, if you want to use these helpers, you will have to setup a browser environment. To do so, you should check out the [browser testing recipe](https://github.com/sindresorhus/ava/blob/master/docs/recipes/browser-testing.md).

To see an example of AVA working together with Enzyme set up for browser testing, you can have a look at [this sample project](https://github.com/adriantoine/ava-enzyme-demo).

## Using JSX helpers

There is another approach to testing React component, which is to use the [`react-element-to-jsx-string`](https://github.com/algolia/react-element-to-jsx-string) package to compare DOM trees as strings, like [`expect-jsx`](https://github.com/algolia/expect-jsx). [You can use `expect-jsx` with AVA](https://github.com/sindresorhus/ava/issues/186#issuecomment-161317068) however it is nicer to use AVA assertions and only rely on helpers.

To do so you can use the [`jsx-test-helpers`](https://github.com/MoOx/jsx-test-helpers) library:

```js
npm install --save-dev jsx-test-helpers
```

and test your React components:
```js
import test from 'ava';
import React from 'react';
import TestUtils from 'react-addons-test-utils';
import { noop, renderJSX, JSX } from 'jsx-test-helpers';
import MyComponent from '../';
import Foo from '../../Foo';

test('Can render & test a class component', t => {
  const actual = renderJSX(<MyComponent />);
  const expected = JSX(
    <div className='MyComponent'>
      <span className='icon-star'/>
      <Foo/>
      <Foo/>
      <Foo/>
    </div>
  );
  t.is(actual, expected);
});

test("Can render & test a class handler on a child", t => {
  t.plan(1);
  const actual = renderJSX(
    <Foo onButtonClick={() => t.pass()} />,
    render => TestUtils.Simulate.click(TestUtils.findRenderedDOMComponentWithTag(render, 'button'))
  );
  const expected = JSX(
    <div className='Foo'>
      <button onClick={ noop }>{'Click Me'}</button>
    </div>
  );
  t.is(actual, expected);
});
```

Note that you have to use variables like `actual` and `expected` because [`power-assert` doesn't handle JSX correctly](https://github.com/power-assert-js/power-assert/issues/34).

You can find an annotated test file [here](https://github.com/MoOx/jsx-test-helpers/blob/master/src/__tests__/index.js) with more examples.
