# lynnjeffress.github.io

Personal site for Lynn Jeffress. Markdown in `writing/` and `pages/` is built into static HTML by `build.js` and deployed to GitHub Pages on push to `main`.

## Local preview

```sh
npm install
npm run dev   # builds, serves at http://localhost:8000, rebuilds on change
```

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) with a required scope from `commitlint.config.cjs`, for example `feat(writing): add late ferry`. `npm install` sets up a hook that checks each message.

## Adding writing

Add a Markdown file to `writing/`. The filename becomes the URL, so `writing/late-ferry.md` is served at `/writing/late-ferry/`.

```md
---
title: Late Ferry
date: 2026-09-01
kind: poem
---

First line of the poem
second line
    an indented line
```

- `kind` is `poem` or `story`. In poems, every line break and leading space is kept. Stories use ordinary paragraphs separated by blank lines.
- `date` (YYYY-MM-DD) sets the ordering, newest first.
- `draft: true` leaves a piece out of the site.
- `---` on its own line inside the text makes a section break.

The About and Contact pages are `pages/about.md` and `pages/contact.md`.
