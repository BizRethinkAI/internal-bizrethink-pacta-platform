import type { Config } from 'tailwindcss';

/** Supplemental utilities for owned legal components; no upstream scan or global reset change. */
export default {
  presets: [require('@documenso/ui/tailwind.config.cjs')],
  important: '[data-legal-workspace]',
  content: { relative: true, files: ['./**/*.tsx', '../mca/components/**/*.tsx'] },
} satisfies Config;
