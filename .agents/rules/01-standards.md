# Rule 01: Engineering Standards & Code Quality

## Typechecking, Linting & Formatting Standards

- **Typechecking (`npm run check`):** Must pass `astro check` and `tsc --noEmit` cleanly with zero warnings or errors.
- **Linting (`npm run lint`):** Powered by **Biome** (`biome check .`) for sub-millisecond AST checking on `.ts`, `.tsx`, `.json`, and `.css` files.
- **Formatting (`npm run format`):** Powered by **Prettier** with `prettier-plugin-tailwindcss` for class sorting and `prettier-plugin-astro` for `.astro` template formatting.
- Enforce strict TypeScript without using `any` or `@ts-ignore` unless strictly unavoidable and commented with justification.
- Keep components modular, small, and single-responsibility.
- Export types and interfaces alongside component definitions.

## Performance & Optimization

- Keep bundle size minimal. Prefer native CSS & browser Web APIs over large third-party npm dependencies.
- Images must use modern WebP/AVIF formats with explicit `width` and `height` to prevent layout shifts (CLS).
- Interactive JS components must use appropriate Astro hydration directives (`client:visible` or `client:idle`).

## Accessibility (a11y)

- Use semantic HTML tags (`<main>`, `<article>`, `<nav>`, `<header>`, `<footer>`, `<section>`).
- All interactive controls (buttons, sliders, cassette deck buttons) must be reachable via `Tab` key and operational with `Space` and `Enter`.
- All visual images must include meaningful `alt` attributes or `aria-hidden="true"` for decorative graphics.
