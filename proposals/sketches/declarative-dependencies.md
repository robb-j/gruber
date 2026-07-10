---
title: Declarative dependencies
date: 2026-07-09
---

# Declarative dependencies

> What problem does this proposal address?
> What benefit is there to adding/changing this?

A model of dependencies is emerging within different Gruber modules that could use some more design around them. There is currently `loader` which is a very basic "memoize" function to only run a method once and cache the result. This in-turn has been used with `defineRoute` to specify one-time-computed dependencies like database connetions or references to app config.

This model only works with synchronous code and very basically handles co-dependencies by using them with another dependencies factory method.

The current model only handles the creation of those dependencies too, it would make sense for the set-up logic to also be paired with tear-down logic to clean up resources.

## Design

```ts
const useStore = defineDependency({
  handler() {
    return new MemoryStore();
  },
});

class Semaphore {
  aquire(key) {}
  async [Symbol.asyncDispose]() {
    // async teardown
  }
  async connect() {}
}

const useSemaphore = defineDependency({
  dependencies: {
    store: useStore,
  },
  handler({ store }) {
    const semaphore = new Semaphore(store);
    await semaphore.connect();
    return semaphore;
  },
});

const something = dependant({
  dependencies: {
    semaphore: useSemaphore,
  },
  async handler({ semaphore }) {
    await using lock = semaphore.aquire("some_key");

    // some logic ...
  },
});

// Clean up dependencies
await something.dispose();
```

## References

> Which project(s) contributed to this proposal?
> Related standards?
> External resources?

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
