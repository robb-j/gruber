# Change log

This file documents notable changes to the project

## 0.8.0

**features**

- Add optional `options` parameter to `authz.assert` to check the scope
- Add experimental `authz.from` method to parse the authenticated user
- Add experimental `CompositeTokens` to combine multiple TokenServices together
- Add experimental `Cors` utility for addings CORS headers to responses
- Add experimental `cors` option to `FetchRouter`

**fixes**

- Add optional `res` parameter to `getResponseReadable` to propagate stream cancellations

## 0.7.0

**new**

- Add Server-sent events utilities
- Add experimental `log` option to `FetchRouter`
- Add experimental `expressMiddleware` and `koaMiddleware`

**fixes**

- Fix malformed node HTTP headers when they contain a comma
- Ignore invalid cookies rather than throw an error
- `getRequestBody` also checks for `multipart/form-data`
- node: `request.signal` is now triggered if the request is cancelled

## 0.6.2

**fixes**

- Use `unknown` type when expecting a dependency, its now on the consumer to make sure they pass the correct thing. TypeScript-ing this is too hard.
- Experimental stores use dependency types too

## 0.6.1

**new**

- Expose `includesScope` to check scopes

**fixes**

- Node & Express handle streams properly, they write the head then stream the response.
- Log HTTP errors in `ExpressRouter` and `KoaRoater`
- Took out type dependencies
- JWTs have the correct expiration time

**changed**

- Renamed `formatCode` to `formatAuthenticationCode`

**unstable**

- Renamed unstable `expireAfter` to `maxAge`
- Renamed unstable `JWTService` to `TokenService`
- Renamed unstable `JoseJwtService` to `JoseTokens`
- Renamed unstable `Authorization#getAuthorization` to `Authorization#assert`
- Added unstable `Authorization#getAuthorization`

## 0.6.0

**new**

- Create the Terminator, an API like [@godaddy/terminus](https://github.com/godaddy/terminus) for cross-platform graceful HTTP shutdown.
- (unstable) Authorize & Authenticate requests
- (unstable) Store things in key-value pairs
- (unstable) `serveHTTP` for Node.js a la `Deno.serve`

**changed**

- Deprecated environment-specific functions in favour of simpler names
  - `get{Node,Deno}ConfigOptions` → `getConfigurationOptions`
  - `get{Node,Deno}Configuration` → `getConfiguration`
  - `get{Node,Deno}PostgresMigratorOptions` → `getPostgresMigratorOptions`
  - `get{Node,Deno}PostgresMigrator` → `getPostgresMigrator`

**fixes**

- NodeRouter sets the correct `duplex` option
- FetchRouter ignores the body for `OPTIONS` & `TRACE` methods

**internal**

- Gruber is now primarily TypeScript, with JavaScript tests

## 0.5.0

**new**

- Add the second argument to `config.getUsage(struct, currentValue)` so that is also documents the current configuration value after the default one
- `ConfigurationOptions#readTextField` accepts URLs and strings
- Allow HTTP `OPTIONS` method
- Experimental `Structure.union` type
- Experimental `Configuration.array` type
- Non `[Configuration.spec]` types are allowed in configuration (and ignored)
- Added `trimIndentation` utility

**fixes**

- Fix `formatMarkdownTable` to generate a valid markdown table
- `ExpressRouter` & `KoaRouter` are processing routes again
- Update deno postgres type-only dependency from `3.4.3` to `3.4.4`
- `Structure.url` handles bad URLs better
- Ignore `$schema` field when parsing configuration

## 0.4.1

**fixes**

- `getDenoConfigOptions`, `getDenoConfiguration`, `getNodeConfigOptions` and `getNodeConfiguration` all have a default options of `{}`
- The Configuration markdown tables calculates the width properly when there are non-strings (URLs) in there
- The `Structure.boolean` method correctly types the optional fallback argument.
- Add experimental `Structure.literal` construct
- `Structure.object` fails if there are additional fields or the value is an instance of a class

## 0.4.0

**new**

- Added `config.number(...)` & `config.boolean(...)` types along with `Structure` equivolents.
- Set a response body when creating a `HTTPError`, either via the constructor or the static methods.
- Set headers when creating an `HTTPError` and mutate the headers on it too, to be passed to the Response.
- Structure primatives' fallback is now optional. If a fallback isn't provided, validation will fail if with a "Missing value" if no value is provided.
- Added an unstable/experimental `Structure.array` for validating an array of a single Structure, e.g. an array of strings.
- Add number and boolean configurations (and their structures)

**fixes**

- Improve JSDoc types for Deno / Node clients
- Fix Structure typings
- Organise Config/Structure/Spec wording

## 0.3.0

**new**

- Removed use of superstruct in favour of new `structures.js` implementation
- Added `getJSONSchema` method to `Configuration`

**fixed**

- Node.js types should work now
- Node.js types includes a url-pattern polyfil

## 0.2.0

**new**

- Added and documented `FetchRouter`
- Generate typings for Node.js
- Unhandled route errors are logged to the console

**fixes**

- Configuration is better typed to be able to infer the final structure
- Add missing NPM package information

**docs**

- Add a section on installation
- Add a section on the releaes process
- Add information about `loader` and `formatMarkdownTable`

## 0.1.0

🎉 Everything is new!
