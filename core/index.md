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

<!--
- `authentication.ts`
  - AuthnRequest
  - AuthnCheck
  - AuthnResult
  - AbstractAuthenticationService
  - formatAuthenticationCode
  - AuthenticationServiceOptions
  - AuthenticationService
- `container.ts`
  - Dependencies
  - UnwrapDependencies
  - WrapDependencies
  - Container
- `migrator.ts`
  - MigrationOptions
  - MigrationDefinition
  - MigrationRecord
  - defineMigration
  - MigrateDirection
  - MigratorOptions
  - Migrator
  - loadMigration
- `random.ts`
  - RandomService
  - useRandom
- `store.ts`
  - StoreSetOptions
  - Store
  - MemoryStore
  - RedisStoreOptions
  - RedisStore
- `terminator.ts`
  - TerminatorOptions
  - TerminatorState
  - TerminatorAction
  - Terminator
- `timers.ts`
  - TimerService
  - useTimers
- `tokens.ts`
  - AuthzToken
  - SignTokenOptions
  - TokenService
  - JoseTokensOptions
  - JoseTokens
  - CompositeTokens
- `types.ts`
  - MaybePromise
  - SqlDependency
  - JoseDependency
  - RedisDependency
- `utilities.ts`
  - formatMarkdownTable
  - loader
  - trimIndentation
  - reconstructTemplateString
  - PromiseList

TBR

- `store.ts`
  - PostgresValue
  - PostgresStoreOptions
  - PostgresStore
- `postgres.ts`
  - PostgresMigrationRecord
  - getPostgresMigrations
  - executePostgresMigration
  - postgresBootstrapMigration
  - definePostgresMigration -->
