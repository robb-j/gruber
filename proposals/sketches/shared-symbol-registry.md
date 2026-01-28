---
title: Shared symbol registry
---

# Shared symbol registry

> Rob Anderson, 28 Jan 2026

## Description

If more symbols are used it would be a good idea to have a registry of them within the project. This would provide a standard way of customising gruber behaviour.

There is currently `Configuration.spec` and upcoming `dangerouslyExpose.custom`

It could be simplified to this and it could simplify the typing too

## Design

There could be a definition like this:

```js
export const GruberSymbol = Object.seal({
  expose: Symbol.for("gruber.dangerouslyExpose"),
  spec: Symbol.for("gruber.configurationSpec"),
});
```

## References

- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#well-known_symbols

## Implementation

- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
