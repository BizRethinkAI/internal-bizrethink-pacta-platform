// MODIFIED for BizRethink overlay 022: rebrand HTML meta tags + OG/Twitter
// previews from upstream Documenso defaults to Pacta. Imports brand constants
// from app.ts (overlay 021) so future renames are a one-file change.
import { type MessageDescriptor, i18n } from '@lingui/core';

import {
  APP_FULL_NAME,
  APP_NAME,
  APP_PARENT_BRAND,
  NEXT_PUBLIC_WEBAPP_URL,
} from '@documenso/lib/constants/app';

export const appMetaTags = (title?: MessageDescriptor) => {
  // MODIFIED for BizRethink (overlay 056): drop the trailing
  // "Built on the Documenso open-source core." sentence — it surfaces in
  // OG/Twitter previews + meta description, which should read like Pacta's
  // own positioning, not a derivative. The AGPL attribution still lives in
  // the marketing site's About + Security pages where it belongs.
  const description = `${APP_FULL_NAME} — the document signing platform built for teams that take agreements seriously. eIDAS-grade cryptographic signatures, AI-assisted contracts, long-term verifiability, and the compliance posture your auditors will sign off on.`;

  return [
    {
      title: title ? `${i18n._(title)} - ${APP_NAME}` : APP_NAME,
    },
    {
      name: 'description',
      content: description,
    },
    {
      name: 'keywords',
      content: `${APP_NAME}, ${APP_PARENT_BRAND}, document signing, electronic signatures, contract management, audit trail, cryptographic signing, multi-tenant signing platform`,
    },
    {
      name: 'author',
      content: APP_PARENT_BRAND,
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: `${APP_NAME} — Agreements that hold`,
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@bizrethink',
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
  ];
};
