# everything

## config

- `configuration.ts`
  - ConfigurationOptions
    - readTextFile
    - getEnvironmentVariable
    - getCommandArgument
    - stringify
    - parse
  - Configuration
    - object
    - array
    - external
    - string
    - number
    - boolean
    - url
    - load
    - getUsage
    - describe
    - getJSONSchema
- `parsers.ts`
  - \_parsePrimative
  - \_parseFloat
  - \_booleans
  - \_parseBoolean
  - \_parseURL
- `specifications.ts`
  - getSpecification
  - \_objectSpec
  - \_arraySpec
  - PrimativeOptions
  - \_primativeSpec
- `standard-schema.ts`
  - StandardSchemaV1
- `struct-context.ts`
  - StructContext
  - DEFAULT_CONTEXT
  - \_nestContext
- `struct-error.ts`
  - \_StructError
- `structure.ts`
  - Schema
  - StructExec
  - Infer
  - InferObject
  - \_additionalProperties
  - Structure
    - Error
      - chain
      - getOneLiner
      - \[Symbol.iterator]
      - toFriendlyString
      - getStandardSchemaIssues
    - ~standard
    - schema
    - \_process
    - process
    - getFullSchema
    - getSchema
    - string
    - number
    - boolean
    - url
    - object
    - array
    - literal
    - union
    - null
    - any
    - partial
    - date

notes

- I'm not sure if Structure belongs in `config`

## core

- `authentication.ts`
  - AuthnRequest
  - AuthnCheck
  - AuthnResult
  - AbstractAuthenticationService
  - formatAuthenticationCode
  - AuthenticationServiceOptions
  - AuthenticationService
    - check
    - start
    - finish
- `container.ts`
  - Dependencies
  - UnwrapDependencies
  - WrapDependencies
  - Container
    - override
    - reset
    - get
    - unwrap
    - proxy
  - unmetDependency
- `migrator.ts`
  - MigrationOptions
  - MigrationDefinition
  - MigrationRecord
  - defineMigration
  - MigrateDirection
  - MigratorOptions
  - Migrator
    - up
    - down
    - \_getTodo
  - loadMigration
- `random.ts`
  - RandomService
  - useRandom
- `store.ts`
  - StoreSetOptions
  - Store
    - get
    - set
    - delete
    - dispose
    - \[Symbol.dispose]
  - MemoryStore
  - RedisStoreOptions
  - RedisStore
- `terminator.ts`
  - TerminatorOptions
  - TerminatorState
  - TerminatorAction
  - Terminator
    - start
    - terminate
    - getResponse
- `timers.ts`
  - TimerService
  - useTimers
- `tokens.ts`
  - AuthzToken
  - SignTokenOptions
  - TokenService
    - verify
    - sign
  - JoseTokensOptions
  - JoseTokens
  - CompositeTokens
- `types.ts`
  - SqlDependency
  - \_SignJWT
  - JoseDependency
  - RedisDependency
- `utilities.ts`
  - formatMarkdownTable
  - loader
  - trimIndentation
  - reconstructTemplateString
  - PromiseList
    - push
    - all
    - length

## deno

- `configuration.ts`
  - DenoConfigurationOptions
  - getConfigurationOptions
  - getConfiguration
- `core.ts`
  - {exports core module}
- `deno-router.ts` — TODO: remove this?
  - DenoRouterOptions
  - DenoRouter
  - serveRouter
- `deps.ts`
  - parseArgs
  - extname
- `http.ts`
  - {exports HTTP module}
- `postgres.ts`
  - PostgresMigratorOptions
  - getPostgresMigratorOptions
  - getPostgresMigrator
- `terminator.ts`
  - DenoTerminatorOptions
  - getTerminatorOptions
  - getTerminator
- `testing.ts`
  - {exports testing module}

notes:

- should platforms be responsible for exporting other modules?
  - it could let them nicely add platform-specific featuers?
- is deno-router still needed?
- it is missing newer module exports

## examples

- deno
- node
- node-fs-migrator

## http

- `authorization.ts`
  - \_getCookies
  - \_getRequestBearer
  - \_getRequestCookie
  - \_expandScopes
  - \_checkScope
  - includesScope
  - AssertOptions
  - AssertUserOptions
  - AssertUserResult
  - AssertServiceResult
  - AuthorizationResult
  - AbstractAuthorizationService
    - getAuthorization
    - assert
    - assertUser
    - from
  - AuthorizationServiceOptions
  - AuthorizationService
- `cors.ts`
  - CorsOptions
  - Cors
    - apply
- `define-route.ts`
  - HTTPMethod
  - RouteResult
  - ExtractRouteParams
  - RouteParams
  - RouteContext
  - RouteHandler
  - RouteOptions
  - RouteDefinition
  - defineRoute
- `fetch-router.ts`
  - \_defaultLogger
  - \_RouteMiddleware
  - \_RouteMatch
  - RouteErrorHandler
  - FetchRouterOptions
  - FetchRouter
    - findMatches
    - processMatches
    - processRoute
    - handleError
    - getResponse
- `http-error.ts`
  - HTTPError
    - badRequest
    - unauthorized
    - notFound
    - internalServerError
    - notImplemented
    - toResponse
- `request-body.ts`
  - getRequestBody
  - assertRequestBody
- `server-sent-events.ts`
  - ServerSentEventMessage
  - \_assertHasNoNewline
  - \_stringify
  - ServerSentEventStream
  - sseHeaders

notes

- I don't like the "AbstractXService" pattern
  - could it be `BookService` + `getBookService`
  - or `interface BookService` + `class BookModule`

## node

- `configuration.ts`
  - getConfigurationOptions
  - getConfiguration
- `core.ts`
  - {exports core module}
- `express-router.ts`
  - ExpressRouter
    - middleware
    - getResponse
    - onRouteError
    - respond
  - expressMiddleware
- `http.ts`
  - {exports HTTP module}
- `koa-router.ts`
  - KoaRouter
    - middleware
    - getResponse
    - onRouteError
    - respond
  - koaMiddleware
- `node-router.ts`
  - NodeRouterOptions
  - NodeRouter
  - applyResponse
  - getFetchRequest
  - getFetchHeaders
  - getIncomingMessageBody
  - getResponseReadable
  - ServeHTTPOptions
  - ServeHTTPHandler
  - serveHTTP
  - StopServerOptions
  - Stoppable
  - createStoppable
- `polyfill.ts`
  - {imports urlpattern-polyfill}
- `postgres.ts`
  - PostgresMigratorOptions
  - getPostgresMigratorOptions
  - getPostgresMigrator
- `terminator.ts`
  - NodeTerminatorOptions
  - getTerminatorOptions
  - getTerminator
- `testing.ts`
  - {exports testing module}

## postgres

- `postgres-migrator.ts`
  - PostgresMigrationRecord
  - getPostgresMigrations
  - executePostgresMigration
  - postgresBootstrapMigration
  - definePostgresMigration
- `postgres-service.ts`
  - PostgresService
    - transaction
    - execute
    - prepare
    - json
    - dispose
    - \[Symbol.asyncDispose]
- `postgres-store.ts`
  - PostgresStoreValue
  - PostgresStoreOptions
  - PostgresStore

## testing

- `spy.ts`
  - Spy
  - spy
- `stubs.ts`
  - fakeToken
  - fakeTokens
  - fakeAuthz
- `testing-router.ts`
  - TestingRequestInit
  - TestingRequest
    - fetch
- `utilities.ts`
  - jsonBody
  - formData
  - authorize
  - Mocking
  - mock
  - mockRepo
  - shallowEqual

## redis?

## jose?
