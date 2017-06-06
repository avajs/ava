# How to test hot observables

Ava supports autosubscribing to cold observables, which will not work for hot observables.
For hot observables, we will need to first subscribe, and then trigger the values to be sent in the stream.
We can automatically unsubscribe by using `#take()`.

## Installing rxjs v5
`npm install --save rxjs`

## Create a source file named interactions.js

```
function create({Rx}) {
  const writeSubject = new Rx.Subject()
  
  function write(data) {
    writeSubject.next(data)
  }
  
  return {
    actions: {write},
    events: {write: writeSubject.toObservable()}
  }
}

export default {
  create
}
```

## Now test it

```
import tests from 'Ava'
import Rx from 'rxjs'
import interactionsFactory from './interactions'

tests(
  `Given that we subscribe to the write event,
  when  the user calls the action write with 'hello'
  then our subscriber recieves the message 'hello'`,
  function onTest(test) {
    const expected = 'hello'
    const interactions = interactionsFactory.create({Rx})
    interactions.events.write.take(1).subscribe(function(actual) {
      test.is(actual, expected)
      test.done()
    })
    interactions.actions.write(expected)
  }
)
```
