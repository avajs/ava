import { test } from 'ava'

test('AVA run TypeScript without tsc', t => {
  let i: number = 42
  t.is(i, <number>42, 'meaning of life')
})
