import test from 'ava';
test('unicorn', function (t) {
    t.pass();
});
test('rainbow', function (t) {
    t.pass();
});
test.serial('cat', function (t) {
    t.pass();
});
test.todo('dog'); // eslint-disable-line ava/no-todo-test
/* eslint-disable max-statements-per-line, ava/no-inline-assertions */
test('sun', function (t) { return t.pass(); });
test('moon', function (t) {
    t.pass();
});
/* eslint-enable max-statements-per-line, ava/no-inline-assertions */
(function () {
    test('nested call', function (t) {
        t.pass();
    });
})();
//# sourceMappingURL=line-numbers.js.map