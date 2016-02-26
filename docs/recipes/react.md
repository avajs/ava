# React testing

With 0.10.0, AVA stopped including your `.babelrc` (for reasons outlined in [this PR](https://github.com/sindresorhus/ava/pull/398)), which means you can't use JSX in your test/spec files. Note that this doesn't apply to your source files, they can still be written in JSX!

The solution is just to use React's regular JS rendering methods, like `React.createElement`.

So here's an example component we'd like to test:

```JavaScript
import React, { PropTypes } from 'react';
import { find } from 'lodash';

const FieldError = ({ errors, attribute, code, children }) => {
  const result = find(errors, { attribute, code });

  if (result) {
    return <span key={`error-${code}`} className="form__error">{ children }</span>;
  }

  /**
   * Stateless components can't return null for now. React 0.15 is supposed to
   * fix that, but for the time being use an empty <span> or <noscript> tag.
   * https://github.com/facebook/react/issues/5355
   */
  return <span />;
};

FieldError.propTypes = {
  errors: PropTypes.array.isRequired,
  attribute: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
  children: PropTypes.string.isRequired,
};

export default FieldError;
```

And here is the test:

```JavaScript
import test from 'ava';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import FieldError from '../../../js/components/form/FieldError.js';

test('FieldError shows when the error is in array', assert => {
  const errors = [{ attribute: 'email', code: '123' }];

  /*
  The JSX way yould look something like this, but would return a syntax error.

  const field = (
    <FieldError attribute="email" code="123" errors={ errors }>
      Error message
    </FieldError>
  );
  */

  const field = React.createElement(FieldError, {
    errors,
    attribute: 'email',
    code: '123',
  }, 'Error message');

  const result = ReactDOMServer.renderToStaticMarkup(field);
  const expectation = '<span class="form__error">Error message</span>';
  assert.same(result, expectation);
});
```
