---
permalink: /index.html
layout: home.njk
---

# Gruber

An isomorphic JavaScript library for creating web apps.

> Named for [Hans](https://purl.r0b.io/gruber)

## Contents

- [Install](#install)
- [Quick tour](/quick-tour/) — a whistle-stop tour of everything
- [Core](/core/) — essentials that use or build on web-standards
- [HTTP](/http/) — quickly create server endpoints
- [Configuration](/config/) — declaratively configure your application
- [Migrations](/core#migrations) — specify transitions between application state
- [Testing](/testing/) — ensure your code does what you expected

## About

Gruber is a collection of modules for creating isomorphic JavaScript applications. 
That means using the same web standards developed for the browser in backend runtimes.
Web-standards aren't going to change, so apps based on them are less likely break in the future.
There's also a hope that [WinterTG](https://wintertc.org/work) works some stuff out.

Gruber acknowledges that web-standards don't do everything we want (at least yet!) and that they aren't implemented properly everywhere either.
For this reason, Gruber tries to be as agnostic as possible and makes building blocks on top of them.
There are **integrations** with specific runtimes & libraries and **modules** that build around those common primitives.

Gruber itself is a library and can be used however you like. The rest are **patterns** which you can apply if you like.
Patterns are ways of structuring your code if you don't already have opinions on the matter.
They also help to explain why Gruber is made in the way it is.

There is a lot not in Gruber too. By design it tries to be as minimal as possible.
For examples, there is a development CORs implementation but a production app should be run behind a reverse proxy and that can do those things for you.

## Terms

These are a few words that pop-up in the documentation, often in bold,
here is what they mean in the context of Gruber:

- **standards** — well-known, non-proprietary, formal and agreed specifications
- **modules** — code built around web-standards and the common core
- **integrations** — a module integrating with a specific JavaScript runtime or library
- **patterns** — optional but recommended best-practices you can adopt

## Background

I've spent several years working on JavaScript backends and nothing has really stuck with me.
There have been lots of nice ideas along the way but no one solution ever felt like home.
It always felt like starting from scratch for each project.

Many frameworks expect you to be making the next big platform with millions of users,
I don't expect this to be true and would prefer to keep things as simple as possible for the projects I am working on.

I'm also quite wary of going all-in on a big tech company's library or framework.
Having explored lots of them, the fatigue from breaking changes or deprecations is real.
"Move fast and break things" sounds great but it creates a lot of maintenance,
especially for small projects and teams.

I'd prefer a style of **move slow and deliberate**.
So I use Gruber in a project and develop features within that project.
Then if the features are really useful or I find myself copy-pasting them between projects,
I'll look into ways of contributing them back to the library.

## Principles

- **Standardised & Compatible** — use existing standards, migrate towards them and try not to break things
- **Agnostic** — a library, framework or runtime shouldn't be forced upon you
- **Patterns** — optional best-practises for how to use modules
- **Composability** — logic should be composed together rather than messily intertwined
- **Minimal & Deliberate** — carefully add only what's is necessary
- **Holistic** — complete ownership and careful abstractions creates unique opportunities for integration
- **No magic** — it's confusing when you don't know what's going on

## Standards

Here is a non-exclusive list of standards that Gruber uses or is interested in.

- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) — used extensively in the HTTP module
- [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) — is used within `FetchRouter`
- [StandardSchema V1](https://standardschema.dev/) — is supported by `Structure` and `assertRequestBody`
- [JSONSchema](https://json-schema.org/) — is used inside `Structure` and can be generated.

Maybe

- [OpenAPI](https://swagger.io/specification/)
- Open CLI?

## Get Started

- [Take the tour →](/tour/)
- [Get started with Node.js →](/node/)
- [Get started with Deno →](/deno/)
