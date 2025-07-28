---
layout: simple.njk
eleventyNavigation:
  key: Integrations
  order: 6
---

# Integrations

These are utilities and wrappers that get you towards using web-standards and Gruber, rather than platform specifics.

{{ collections.all | eleventyNavigation("Integrations") | eleventyNavigationToHtml | safe }}
