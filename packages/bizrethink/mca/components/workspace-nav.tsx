import { Trans } from '@lingui/react/macro';
import { Link, useLocation } from 'react-router';

/** One workspace, with separate authored-content and verification views. */
export const McaWorkspaceNav = () => {
  const location = useLocation();
  const reusable = new URLSearchParams(location.search).get('catalogue') === 'reusable';
  const active = location.pathname === '/admin/mca' ? 'requirements' : reusable ? 'reusable' : 'clauses';
  const tabs = [
    { id: 'clauses', href: '/admin/mca-library', label: <Trans>Clauses</Trans> },
    { id: 'reusable', href: '/admin/mca-library?catalogue=reusable', label: <Trans>Reusable content</Trans> },
    { id: 'requirements', href: '/admin/mca', label: <Trans>Disclosures & requirements</Trans> },
  ];
  return (
    <nav aria-label="MCA workspace" className="mb-6 flex flex-wrap gap-2 border-border border-b pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={
            active === tab.id
              ? 'rounded-md bg-muted px-3 py-2 font-medium text-sm'
              : 'rounded-md px-3 py-2 text-muted-foreground text-sm hover:bg-muted'
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
};
