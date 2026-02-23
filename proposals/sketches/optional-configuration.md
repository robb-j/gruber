---
title: Optional Configuration
date: 2024-04-19
---

# Optional Configuration

It would be useful to have strongly-typed optional configuration, it doesn't always makes sense for all values to be set. The current solution is to have an empty fallback value

## Design

```js
import { getConfiguration } from "gruber";

const config = getConfiguration();

const struct = config.object({
  allowlist: config.string(),
});

const appConfig = "…";

appConfig.allowlist; // string | undefined
```

It could alternatively allow passing `null` or `undefined` to the fallback option?

## References

- https://github.com/robb-j/gruber/issues/14

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
