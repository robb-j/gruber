# Change log

This file documents notable changes to the project

## next

**new**

- Set a response body when creating a `HTTPError`, either via the constructor or the static methods.
- Structure primatives' fallback is now optional. If a fallback isn't provided, validation will fail if with a "Missing value" if no value is provided.
- Added an unstable/experimental `Structure.array` for validating an array of a single Structure, e.g. an array of strings.
- Added `config.number(...)` & `config.boolean(...)` types along with `Structure` equivolents.

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
