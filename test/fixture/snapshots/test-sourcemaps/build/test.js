import test from '../../../../..';
test('top level test title', t => {
    t.snapshot({ foo: 'bar' });
    t.snapshot({ answer: 42 });
});
test('another top level test', t => {
    t.snapshot(new Map());
});
//# sourceMappingURL=test.js.map