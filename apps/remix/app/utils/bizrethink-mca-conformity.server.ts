import { conformitySurface, envelopeShapes, OPEN_READINGS } from '@bizrethink/customizations';

/**
 * The server-only half of `/admin/mca`.
 *
 * WHY THIS FILE EXISTS, RATHER THAN THE ROUTE CALLING THE PACKAGE DIRECTLY.
 *
 * `conformitySurface()` reads the vendored statutes off disk, so its module
 * graph reaches `node:fs`, `node:path` and `node:crypto`. The first attempt
 * imported it straight into `admin+/mca.tsx` and used it only in the `loader`,
 * on the assumption that the React Router plugin's dead-code elimination would
 * keep it out of the browser bundle. It did not, and the **client** build
 * failed:
 *
 *     "join" is not exported by "__vite-browser-external",
 *     imported by packages/bizrethink/mca/provenance/source-text.ts
 *
 * Relying on tree-shaking for that is relying on an optimisation for
 * correctness. `.server.ts` is the mechanism that actually guarantees it: the
 * React Router Vite plugin replaces such a module with a stub in the client
 * build, so nothing here can ever reach a browser. Same convention as
 * `app/storage/theme-session.server.ts`.
 *
 * Nothing else belongs in here. The route imports its TYPES directly from
 * `@bizrethink/customizations` (erased at compile time) and
 * `JURISDICTION_NAMES` from `@bizrethink/customizations/mca/jurisdictions`,
 * which is a pure data module with no imports at all.
 */
export const buildMcaConformityView = () => {
  const surface = conformitySurface();

  return {
    library: surface.library as string,
    jurisdictions: [...surface.jurisdictions],
    entries: surface.entries,
    envelopes: envelopeShapes(),
    readings: [...OPEN_READINGS],
  };
};
