# Change log

This file documents notable changes to the project

## next

**new**

- add the second argument to `config.getUsage(struct, currentValue)` so that is also documents the current configuration value after the default one

**fixes**

- fix `formatMarkdownTable` to generate a valid markdown table
- `ExpressRouter` & `KoaRouter` processing routes again

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
