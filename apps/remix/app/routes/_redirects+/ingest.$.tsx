// MODIFIED for BizRethink (overlay 090): analytics receives content with a minimal header allowlist.
import { posthogProxy } from '@bizrethink/customizations/server-only/analytics-proxy';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

export const loader = ({ request }: LoaderFunctionArgs) => posthogProxy(request);
export const action = ({ request }: ActionFunctionArgs) => posthogProxy(request);
