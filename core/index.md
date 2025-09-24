---
layout: api.njk
eleventyNavigation:
  key: Core
  order: 2
api:
  entrypoint: core/mod.ts
---

# Core

At the centre of Gruber are a set of agnostic modules to help create platform-independent JavaScript servers. They are roughly organised as:

- **Migrator** is a helper for structuring project migrations that run up or down to manage the state of something like a database.
- **Store** is an abstraction for interacting with asynchonous key-value storage
- **Terminator** is a utility for ensuring graceful shutdown of your apps, especially when behind a load-balancer
- **Tokens** are an abstraction around signing access to a user to be consumed by other parts of the application
- **Container** is a dependency management utility to capture code dependencies, provide them on demand and allow them to be replaced during testing.
- **Miscellaneous** contains various things that are often useful
