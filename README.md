---
permalink: /index.html
layout: home.njk
---

# Gruber

An isomorphic JavaScript library for creating web apps.

> Named for [Hans](https://purl.r0b.io/gruber)

## Contents

- [Install](#install)
- [Quick tour](/quick-tour/) — a whistle-stop tour of all of Gruber
- [Core](/core/) — essential primitives that use or build on web-standards
- [HTTP](/http/) — quickly define server endpoints
- [Configuration](/config/) — specify exactly how to configure your application
- [Migrations](/core#migrations) — curate how to migrate your state
- [Testing](/testing/) — ensure your code does what you thought it does
- [Node](/node/) — easily use Gruber in Node.js
- [Deno](/deno/) — easily use Gruber in Deno
- [Examples](/examples/) — more in-depth use cases and patterns

## About

Gruber is a collection of modules for creating isomorphic JavaScript applications, that means web-standards JavaScript on the front- and back-end. It's a bet that web-standards aren't going to change, so our apps don't break in the future. There's also a hope that [WinterTG](https://wintertc.org/work) works some stuff out. (Previously WinterCG, which is a good step!)

Gruber acknowledges that web-standards don't do everything we want (at least yet!) and that they aren't implemented properly everywhere either.
For this reason, the core of Gruber is agnostic and attempts to make sensible building blocks on top of them. Then there are **helpers** for using specific runtimes and **modules** that build around those common primitives.

Gruber itself is a library and can be used however you like. The rest are **patterns** which you can apply if you like.
Patterns are ways of structuring your code if you don't already have opinions on the matter.
They also help to explain why Gruber is made in the way it is.

There is a lot not in Gruber too. By design it tries to be as minimal as possible.
For examples, there is a development CORs implementation but a production app should be run behind a reverse proxy and that can do those things for you.

## Background

I've spent several years working on JavaScript backends and nothing has really stuck with me.
There have been lots of nice ideas along the way but no one solution ever felt like home.
It always felt like starting from scratch for each project.

Some of the apps I've made:

- [Open Lab Hub](https://github.com/digitalinteraction/hub.openlab.dev) — Deno + Oak + vue3 + vite
- [BeanCounter](https://github.com/digitalinteraction/beancounter) — Node.js + Koa + vanilla js + parcel
- [MozFest Plaza](https://github.com/digitalinteraction/mozfest) — Node.js + Koa + vue2 + webpack
- [Sticker Stories](https://github.com/digitalinteraction/sticker-stories) — Node.js + Koa + vue3 + vite
- [Data Diaries](https://github.com/digitalinteraction/data-diaries) — Node.js + Koa + vue3 + vite
- [DataOfficer](https://github.com/digitalinteraction/data-officer) — Deno + Acorn
- [IrisMsg](https://github.com/digitalinteraction/iris-msg/tree/master) — Node.js + Express + native app
- [Poster Vote](https://github.com/digitalinteraction/poster-vote) — Node.js + Express + vue + webpack

Many frameworks expect you to be making the next big platform with millions of users,
I don't expect this to be true and would prefer to keep things as simple as possible for the projects I am working on.

I'm also quite wary of going all-in on a big tech company's library or framework,
having explored lots of them on smaller projects.
The fatigue from breaking changes or deprecations is real,
"move fast and break things" sounds great but it creates a lot of maintenance.
Especially when you work of lots of small projects in small teams.

I'd prefer a style of **move slow then contribute back**.
So I use Gruber in a project and develop features in that project.
The if the features are really useful and I find myself copy-pasting them between projects,
I'll look into ways of contributing them back to the library.

## Principles

- **Composability** — logic should be composed together rather than messily intertwined
- **Standards** based — where available existing standards should be applied or migrated towards
- **Agnostic** — a frontend framework or backend runtime shouldn't be forced upon you
- **Patterns** — how you _could_ use modules rather than enforce an implementation
- **Minimal** — start small, carefully add features and consider removing them
- **Holistic** — complete ownership or careful abstractions creates unique opportunities for integration
- **No magic** — it's confusing when you don't know what's going on

## Install

**Node.js**

Gruber is available on NPM as [gruber](https://www.npmjs.com/package/gruber).

```bash
# cd to/your/project
npm install gruber
```

and use it like this:

```js
import { defineRoute } from "gruber";
```

**Deno**

Gruber is available at `esm.r0b.io/gruber@{{ pkg.version }}/mod.ts`, add it to your _deno.json_:

<esm-info endpoint="https://js-modules.ams3.digitaloceanspaces.com"></esm-info>

```
{
  "imports": {
    "gruber/": "https://esm.r0b.io/gruber@{{ pkg.version }}/"
  }
}
```

Then use it like this:

```js
import { defineRoute } from "gruber/mod.ts";
```
