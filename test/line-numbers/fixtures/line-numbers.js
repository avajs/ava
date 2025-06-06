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
test.todo('dog');
test('sun', function (t) { return t.pass(); });
test('moon', function (t) {
    t.pass();
});
(function () {
    test('nested call', function (t) {
        t.pass();
    });
})();
//# sourceMappingURL=line-numbers.js.map