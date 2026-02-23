---
title: File Structure
date: 2024-03-15
---

# File Structure

The Configuration interface could also capture the current working directory (maybe as a URL?) so then `config.url` could take relative URLs. This would make it useful for capturing file paths using the `file:` protocol as well as external urls like `https:` or `postgres:`.

There would need to be a `workingDirectory` addition to `ConfigurationOptions` to initially capture the directory. Then like `number` and `boolean` (#3), it could try to create the URL with that value as the second constructor parameter to be passed to the `Structure`

## Design

```js
import { getConfiguration } from "gruber";

const config = getConfiguration();

const struct = config.object({
  coverImage: config.file("./assets/cover.png"),
  allowlist: config.file("./allowlist.txt", { format: "utf8" }),
});

const appConfig = "…";

appConfig.coverImage; // UInt8Array
appConfig.allowlist; //  string
```

## References

- https://github.com/robb-j/gruber/issues/6

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
