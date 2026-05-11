import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  AlertTriangleIcon,
  BarChart3,
  Building2Icon,
  ClockIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileStack,
  KeyIcon,
  KeyRoundIcon,
  LogInIcon,
  MailIcon,
  ScrollTextIcon,
  Settings,
  SparklesIcon,
  Trophy,
  Users,
  Wallet2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, Outlet, redirect, useLocation } from 'react-router';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { LicenseClient } from '@documenso/lib/server-only/license/license-client';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { cn } from '@documenso/ui/lib/utils';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';

import { AdminLicenseStatusBanner } from '~/components/general/admin-license-status-banner';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/_layout';

// MODIFIED for BizRethink (overlay 047): admin sidebar reorganization.
//
// Replaced upstream's 9 hand-rolled flat <Button> nav items + our 5 appended
// items with a single NAV_GROUPS data structure rendered through NavGroup +
// NavItem helpers. Four groups: Insights / Data / Identity & Access /
// Configuration. Items added by BizRethink overlays carry a small "BR" pill
// (Badge variant=secondary) so the operator can tell at a glance which
// screens are our enhancements vs upstream Documenso.
//
// Disabled "Soon" rows reserve space for planned pages (API Keys, Audit Log,
// Jobs status) — enabling them later is a one-line `disabledSoon: false`
// flip plus a new route file.
//
// Why this is invasive (lots of lines): the upstream layout uses repeated
// <Button asChild><Link>...</Link></Button> blocks with no shared structure.
// A grouping + flag overlay that touches the structure has to replace those
// blocks; the diff size reflects that, not added complexity.

type NavItemDef = {
  label: React.ReactNode;
  href: string;
  icon: LucideIcon;
  // True if the route + UI + data model is entirely BizRethink, OR if we
  // changed the underlying behavior meaningfully via overlays (per user
  // 2026-05-11 — Email Domains qualifies because of SES→DNS swap).
  bizrethink: boolean;
  // Placeholder for a planned page. Renders disabled + "Soon" pill.
  disabledSoon?: boolean;
};

type NavGroupDef = {
  heading: React.ReactNode;
  items: NavItemDef[];
};

const NAV_GROUPS: NavGroupDef[] = [
  {
    heading: <Trans>Insights</Trans>,
    items: [
      { label: <Trans>Stats</Trans>, href: '/admin/stats', icon: BarChart3, bizrethink: false },
      {
        label: <Trans>Organisation Insights</Trans>,
        href: '/admin/organisation-insights',
        icon: Trophy,
        bizrethink: true,
      },
      {
        label: <Trans>Audit Log</Trans>,
        href: '/admin/audit-log',
        icon: ScrollTextIcon,
        bizrethink: true,
        disabledSoon: true,
      },
      {
        label: <Trans>Jobs & Crons</Trans>,
        href: '/admin/jobs',
        icon: ClockIcon,
        bizrethink: true,
        disabledSoon: true,
      },
    ],
  },
  {
    heading: <Trans>Data</Trans>,
    items: [
      {
        label: <Trans>Organisations</Trans>,
        href: '/admin/organisations',
        icon: Building2Icon,
        bizrethink: false,
      },
      { label: <Trans>Claims</Trans>, href: '/admin/claims', icon: Wallet2, bizrethink: false },
      {
        label: <Trans>Documents</Trans>,
        href: '/admin/documents',
        icon: FileStack,
        bizrethink: false,
      },
      {
        label: <Trans>Unsealed Documents</Trans>,
        href: '/admin/unsealed-documents',
        icon: AlertTriangleIcon,
        bizrethink: true,
      },
    ],
  },
  {
    heading: <Trans>Identity & Access</Trans>,
    items: [
      { label: <Trans>Users</Trans>, href: '/admin/users', icon: Users, bizrethink: false },
      {
        label: <Trans>SSO Providers</Trans>,
        href: '/admin/sso-providers',
        icon: LogInIcon,
        bizrethink: true,
      },
      {
        label: <Trans>Email Domains</Trans>,
        href: '/admin/email-domains',
        icon: MailIcon,
        // User-overridden 2026-05-11: flag BR because of SES→DNS swap +
        // paywall removal overlays, even though page UI is upstream.
        bizrethink: true,
      },
      {
        label: <Trans>API Keys & Webhooks</Trans>,
        href: '/admin/api-keys',
        icon: KeyIcon,
        bizrethink: true,
        disabledSoon: true,
      },
    ],
  },
  {
    heading: <Trans>Configuration</Trans>,
    items: [
      {
        label: <Trans>Site Settings</Trans>,
        href: '/admin/site-settings',
        icon: Settings,
        bizrethink: false,
      },
      {
        label: <Trans>Signing Config</Trans>,
        href: '/admin/signing',
        icon: KeyRoundIcon,
        bizrethink: true,
      },
      {
        label: <Trans>Storage</Trans>,
        href: '/admin/storage',
        icon: DatabaseIcon,
        bizrethink: true,
      },
      {
        label: <Trans>AI Config</Trans>,
        href: '/admin/ai',
        icon: SparklesIcon,
        bizrethink: true,
      },
      {
        label: <Trans>Billing & Stripe</Trans>,
        href: '/admin/stripe',
        icon: CreditCardIcon,
        bizrethink: true,
      },
    ],
  },
];

const NavItem = ({ item, pathname }: { item: NavItemDef; pathname: string | undefined }) => {
  const Icon = item.icon;
  const isActive = pathname?.startsWith(item.href) ?? false;

  // Disabled "Soon" placeholder — not clickable. Visually muted; same
  // baseline layout as live items so future enablement is just flipping
  // the flag.
  if (item.disabledSoon) {
    return (
      <div
        className={cn(
          'flex items-center justify-start gap-2 px-3 py-2 text-sm',
          'text-muted-foreground cursor-not-allowed opacity-60',
        )}
        aria-disabled="true"
        title="Coming soon"
      >
        <Icon className="h-5 w-5" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.bizrethink && (
          <Badge variant="secondary" size="small" title="Added by BizRethink">
            BR
          </Badge>
        )}
        <Badge variant="neutral" size="small">
          Soon
        </Badge>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className={cn('justify-start md:w-full', isActive && 'bg-secondary')}
      asChild
    >
      <Link to={item.href}>
        <Icon className="mr-2 h-5 w-5" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.bizrethink && (
          <Badge variant="secondary" size="small" className="ml-2" title="Added by BizRethink">
            BR
          </Badge>
        )}
      </Link>
    </Button>
  );
};

const NavGroup = ({ group, pathname }: { group: NavGroupDef; pathname: string | undefined }) => (
  <div className="flex flex-col gap-1">
    <div className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase">
      {group.heading}
    </div>
    {group.items.map((item) => (
      <NavItem key={item.href} item={item} pathname={pathname} />
    ))}
  </div>
);

export function meta() {
  return appMetaTags(msg`Admin`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  const license = await LicenseClient.getInstance()?.getCachedLicense();

  if (!user || !isAdmin(user)) {
    throw redirect('/');
  }

  return {
    license: license || null,
  };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { license } = loaderData;
  const { pathname } = useLocation();

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 md:px-8">
      <AdminLicenseStatusBanner license={license} />

      <h1 className="text-4xl font-semibold">
        <Trans>Admin Panel</Trans>
      </h1>

      <div className="mt-4 grid grid-cols-12 gap-x-8 md:mt-8">
        <div
          className={cn(
            'col-span-12 flex gap-x-2.5 gap-y-2 overflow-hidden overflow-x-auto md:col-span-3 md:flex md:flex-col',
          )}
        >
          {NAV_GROUPS.map((group, idx) => (
            <NavGroup key={idx} group={group} pathname={pathname} />
          ))}
        </div>

        <div className="col-span-12 mt-12 md:col-span-9 md:mt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
