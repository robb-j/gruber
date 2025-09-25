---
layout: api.njk
eleventyNavigation:
  key: Config
  order: 4
api:
  entrypoint: config/mod.ts
---

# Configuration

The goal of the **Configuration** module is to let you declaratively define how your application pulls in values from the system and structure them in an easy accessible format.

- **no magic** — you tell it how you want things done.
- **always available** — as much as possible, configuration should parse and and use fallback values so it is as easy as possible to run the app.
- **have precident** — cli flags > environment variables > configuration files > fallbacks, in that order
- **always valid** — once declared, your value should always match that structure so there are no unexpected errors

Things you might want to configure:

- How much logging to do
- The databases to connect to
- Which features to turn on or off
- Tokens for thirdy-party APIs
- Who to send emails from

This module was heavily inspired by
[12 fractured apps](https://medium.com/@kelseyhightower/12-fractured-apps-1080c73d481c)
and [superstruct](https://docs.superstructjs.org/) which has a lovely API.

- Load in from the runtime environment and/or configuration files
- Have sensible defaults so it does not fail if environment variables or configuration files are missing
- Apply a precedence between different sources
- Always be structurally valid so the rest of you code can rely on that

You define your configuration like this:

```js
import { getConfiguration } from "gruber";

const config = getConfiguration();

const struct = config.object({
  env: config.string({ variable: "NODE_ENV", fallback: "development" }),

  server: config.object({
    port: config.number({
      variable: "APP_PORT",
      flag: "--port",
      fallback: 3000,
    }),
    url: config.url({
      variable: "SELF_URL",
      fallback: "http://localhost:3000",
    }),
  }),
});
```

You can start to see the shape of your configuration, at the top-level there is `env` which pulls from the `NODE_ENV` environment variable and falls back to "development" if not set.

There is also a `server` object with a `port` number and `url` field, each pulling different variables or flags and providing their own fallbacks. Fallbacks are important so you don't have to specify every single argument when you set up a fresh environment.

Another **Pattern** I like to use is to include a `meta` object like below. It allows you to have a single source of truth for the name and version of the app. Which is often useful in a meta endpoint that returns this information, or if the app needs to construct a User-Agent to represent itself.

```js
import pkg from "./package.json" with { type: "json" };

const config = getConfiguration();

const struct = config.object({
  // ...
  meta: config.object({
    name: config.string({ variable: "APP_NAME", fallback: pkg.name }),
    version: config.string({ variable: "APP_VERSION", fallback: pkg.version }),
  }),
});
```

Once you have that structure, you can use it to parse your configuration:

```js
// Load the configuration and parse it
export function loadConfiguration(path) {
  return config.load(path, struct);
}

// The configutation for use in the application
export const appConfig = await loadConfiguration(
  new URL("./config.json", import.meta.url),
);
```

You use [config.load](#configuration-load) to process the configuration against given file and the environment itself.

A nice **Pattern** to use is to also export the `appConfig` so it is easy to access everywhere and strongly-typed.

You can do more with configuration, its useful to see how your app is currently configured and what options are available:

```js
// A method to generate usage documentation
export function getConfigurationUsage() {
  return config.getUsage(struct, appConfig);
}
```

Which when called, will output something like this:

```
Usage:

| name         | type   | flag   | variable    | fallback               |
| ------------ | ------ | -------| ----------- | ---------------------- |
| env          | string | ~      | NODE_ENV    | development            |
| server.port  | number | --port | PORT        | 3000                   |
| server.url   | url    | ~      | SELF_URL    | http://localhost:3000  |
| meta.name    | string | ~      | APP_NAME    | gruber-app             |
| meta.version | string | ~      | APP_VERSION | 1.2.3                  |

Default:
{
  "env": "development",
  "meta": {
    "name": "gruber-app",
    "version": "1.2.3"
  },
  "server": {
    "port":
  }
}
```

Running this from the CLI is very useful to see what is going on,
if you pass the second parameter to `getConfigurationUsage` it will show you how it is configured too.
The default value is useful for initially creating your configuration too.

From this you can see that you can set the port by either specifying the `PORT` environment variable, using the `--port` CLI flag or setting `server.port` field in the configuration file.

## Considerations

You should consider the security for your default values,
e.g. if you app runs differently under NODE_ENV=production
and you forget to set it, what is the implication?

If you use something like `dotenv`, ensure it has already loaded before creating the configuration.

A **Pattern** is to add extra checks to `loadConfiguration` to ensure things are correct in production,
so only well-configured apps will successfully deploy.
This can be done like so:

```js
export function loadConfiguration(path) {
  const appConfig = config.loadJsonSync(path, struct);

  // Only run these checks when running in production
  if (appConfig.env !== "development") {
    if (appConfig.database.url.href.includes("top_secret")) {
      throw new Error("database.url has not been configured");
    }
    // more checks ...
  }

  return preventExtraction(appConfig);
}
```

This checks the default value for `database.url` is not used when in production mode.

A **Pattern** I follow is to assume the app is in `development` mode,
then when I build the app as a container set the `NODE_ENV` variable to production.
When running as a container it assumes it is in production and runs the extra checks.

While a **Pattern**, it is strongly recommended to call [preventExtraction](/core/#preventextraction) on your configuration value
to prevent any accidental exposure of your credentials. If credentials are console.log-ed or passed to JSON.stringify it will throw an error isntead.
This is likely to happen under the hood in the 1.0 release.
