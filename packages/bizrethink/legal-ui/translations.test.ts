import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCatalogs } from '@lingui/cli/api';
import { type ExtractedCatalogType, getConfig } from '@lingui/conf';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
import { describe, expect, it } from 'vitest';

describe('legal workspace production translations', () => {
  it('extracts readable reference and filter controls with the application catalog configuration', async () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const config = getConfig({ cwd: root, configPath: resolve(root, 'lingui.config.ts') });
    // The CLI runs at the repository root; Vitest runs from this package.
    const catalogs = await getCatalogs({
      ...config,
      catalogs: (config.catalogs ?? []).map((catalog) => ({
        ...catalog,
        include: catalog.include?.map((path) => resolve(root, path)),
      })),
    });
    const files = ['reader.tsx', 'catalogue-toolbar.tsx'].map((name) => fileURLToPath(new URL(name, import.meta.url)));
    const collected = await Promise.all(catalogs.map((catalog) => catalog.collect({ files })));
    const messages: ExtractedCatalogType = Object.assign({}, ...collected);
    for (const label of [
      'Citation context',
      'Open in reading context',
      'Back to previous reference',
      'Return to passage',
      'Reference outside this review',
      'Clear filters',
    ]) {
      expect(messages[generateMessageId(label)]?.message, label).toBe(label);
    }
  });
});
