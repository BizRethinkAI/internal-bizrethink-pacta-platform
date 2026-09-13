import { APP_I18N_OPTIONS } from '@documenso/lib/constants/locales';
import type { LinguiConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';

const config: LinguiConfig = {
  sourceLocale: APP_I18N_OPTIONS.sourceLang,
  locales: APP_I18N_OPTIONS.supportedLangs as unknown as string[],
  // Any changes to these catalogue paths should be reflected in crowdin.yml
  catalogs: [
    {
      path: '<rootDir>/packages/lib/translations/{locale}/web',
      // MODIFIED for BizRethink (overlay 085): extract the owned MCA workspace UI.
      include: [
        'apps/remix/app',
        'packages/ui',
        'packages/lib',
        'packages/email',
        'packages/bizrethink/mca/components',
      ],
      exclude: ['**/node_modules/**'],
    },
  ],
  compileNamespace: 'es',
  format: formatter({ lineNumbers: false }),
};

export default config;
