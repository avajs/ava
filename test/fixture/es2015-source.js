import test from '../../';
import increment from '../../increment-fixture';

test(t => {
  let n = 1;
  let x = increment(n);
  t.ok(x !== n);
  t.ok(x === 2);
  t.end();
});
