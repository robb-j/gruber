---
layout: simple.njk
---

# Gruber Enhancement Proposals

This is the proposal system to introduce, track, iterate & implement new features within Gruber.

## Design goals

- Proposals should follow the [Gruber principles](/#principles)
- Simple, complication introduces friction
- Careful design doesn't need to change
- Centralised is easy to track

## Prior art

- https://github.com/tc39/proposals
- https://www.kubernetes.dev/resources/keps/

## Ideal process

1. Things are created that use Gruber as-is
2. (optional) A proposal is created to track the feature — `IDEA`
3. Changes are implemented in those things
4. Those changes are iterated on within that thing
5. Changes are copied to use in other things
6. The proposal is updated to reference the new thing(s) — `SKETCH`
7. The proposal is iterated to find a stable API
8. The proposal is implemented, tested & documented
9. Things are update to use the beta implementation
10. The implementation & documentation are refined
11. The proposal is released — `COMPLETE`

## Stages

0. `IDEA` — General ideas for features, this could just be a text list
1. `SKETCH` — The start of a proposal
2. `COMPLETE` — The change made it into Gruber
3. `ARCHIVE` — The change was not taken further

## Template

```
---
title: {PROPOSAL_NAME}
---

# {PROPOSAL_NAME}

> {AUTHORS_LIST}, {CREATED_DATE}

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

- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
```

## Ideas

These are informal ideas for features that haven't been sketched out.

- ???

{% include "proposals.njk" %}
