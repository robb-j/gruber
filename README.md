---
permalink: /index.html
layout: home.njk
---

# Gruber

An isomorphic JavaScript library for creating web apps.

> Named for [Hans](https://purl.r0b.io/gruber)

## Contents

- [Quick tour](/quick-tour/)
- [Core](/core/)
- [HTTP](/http/)
- [Configuration](/config/)
- [Migrations](/core#migrations)
- [Testing](/testing/)
- [Node](/node/)
- [Deno](/deno/)
- [Examples](/examples/)

## About

Gruber is a collection of modules for creating isomorphic JavaScript applications, that means web-standards JavaScript on the front- and back-end. It's a bet that web-standards aren't going to change, so our apps don't break in the future. There's also a hope that [WinterTG](https://wintertc.org/work) works some stuff out. (Previously WinterCG, which is a good step!)

Gruber acknowledges that web-standards don't do everything we want (at least yet!) and that they aren't implemented properly everwhere either.
For this reason, the core of Gruber is agnostic and attempts to make sensible building blocks on top of them. Then there are **helpers** for using specific runtimes and **modules** that build around those common primatives.

Gruber itself is a library and can be used however you like. The rest are **patterns** which you can apply if you like.
Patterns are ways of structuring your code if you don't already have opinions on the matter.
They also help to explain why Gruber is made in the way it is.

There is a lot not in Gruber too. By design it tries to be as minimal as possible.
For examples, there is a development CORs implementation but a production app should be run behind a reverse proxy and that can do those things for you.

## Why does this exist

I've spent the past few years working on JavaScript backends and nothing has really stuck with me.
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

## Principles

- Composability — logic should be composed together rather than messily intertwined
- Standards based — where available existing standards should be applied or migrated towards
- Agnostic — a frontend framework or backend runtime shouldn't be forced upon you
- Patterns — how you _could_ use modules rather than enforce an implementation
- Minimal — start small, carefully add features and consider removing them
- Hollistic — by owning the tech-stack it creates unique opportunities for integration
- No magic — it's confusing when you don't know whats going on
