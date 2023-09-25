import { on } from "node:events"

export class ExternalRunObserver {
  constructor(api, externalObserveHandler) {
    externalObserveHandler({
      events: this.eventsFromApi(api)
    })
  }

  async * eventsFromApi(api) {
    for await (const [plan] of on(api, 'run')) {
      yield {
        type: 'run',
        plan
      };

      for await (const [stateChange] of on(plan.status, 'stateChange')) {
        yield {
          type: 'stateChange',
          stateChange
        }
      }
    }
  }
}
