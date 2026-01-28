---
title: Gruber enhancement proposals
---

# Gruber Enhancement Proposals proposal

> Rob Anderson, 23 Jan 2026

This is the a proposal for Gruber to set up a system to introduce, track, iterate & implement new features within Gruber.

## Description

As more features are added to Gruber, it has become a bit messy to keep track of them all and implement them consistently. Larger projects have "enhancement proposals" systems to track and manage this better. This proposal explores that in the context of Gruber.

> This has been retroactively edited to fit back into its own standard.

### Goals

- As simple as possible, anything complicated will not be followed
- Carefully design new Gruber APIs & functionality
- Minimal breaking changes
- Centralised to keep everything easy to find in one place
- This document should be the documentation for the proposals system

### Similar systems:

- https://github.com/tc39/proposals
- https://www.kubernetes.dev/resources/keps/

### Questions:

- What should a GEP contain?
- Should there be stages to GEPs, like in TC39?
- What are the criteria for GEPs to move between stages?
- What is the overall / ideal process
- How can the process adapt over time?
- Should proposals be markdown-first or data-first?

### The current process

- Features are implemented or monkey-patched within projects that use Gruber. e.g.
  - Table primatives were prototyped within Make Place
  - That abstraction was also copied into the Open Lab Hub and improved / modified to work better
- If that feature is copied a few times and the implementation feels complete, it is considered as a new Gruber feature.

## Design

### Stages

0. `IDEA` — General ideas for features, this could just be a text list
1. `SKETCH` — The start of a proposal and it is assigned a number e.g. `001`
2. `COMPLETE` — The change made it into Gruber
3. `ABANDONED` — The change was not taken further

### Contents

- The problem the proposal works towards solving
- What are the new API(s) being added or changed, documented through example usage
- The history or alternate implementaions that were considered
- Any existing standards that can be used
- Which projects contributed to this proposal
- The Author(s) of the proposal
- Implementation checklist

### Template

```
# 000 - {PROPOSAL_NAME}

{PROPOSAL_STAGE} — {AUTHORS_LIST}

## Description

> What problem does this proposal address?
> What benefit is there to adding/changing this?

## Design

> What will it look like to use this API? With code examples?
> Are there different ways of solving this problem?

## References

> What project(s) contributed to this proposal?
> Link to external resources
> Link to related standards

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
```

## References

**Prior art**

- [TC39 ~ JavaScript](https://github.com/tc39/proposals)
- [Kubernetes enhancement proposals](https://www.kubernetes.dev/resources/keps/)

**Current ideas**

- [Symbol registry](https://github.com/robb-j/gruber/issues/63)
- [config.getUsage improvement](https://github.com/robb-j/gruber/issues/62)
- [CLI module](https://github.com/robb-j/gruber/issues/54)
- [Testing module](https://github.com/robb-j/gruber/issues/55)
- [interface structure](https://github.com/robb-j/gruber/issues/44)

## Implementation

- [x] Initial Sketch
- [x] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
