import { type HTMLAttributes, useEffect, useState } from 'react';

import { ReadStatus } from '@prisma/client';
import { InboxIcon, MenuIcon, SearchIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { getRootHref } from '@documenso/lib/utils/params';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';

import { BrandingLogo } from '~/components/general/branding-logo';

import { AppCommandMenu } from './app-command-menu';
import { AppNavDesktop } from './app-nav-desktop';
import { AppNavMobile } from './app-nav-mobile';
// MODIFIED for BizRethink (overlay 049): always render OrgMenuSwitcher,
// even for solo-Personal-Org users. Upstream Documenso swaps in a
// stripped <MenuSwitcher /> for `isPersonalLayout()` users — that variant
// has NO link to /o/<orgUrl>/settings, so the Personal Org's billing page
// becomes unreachable from the UI. For Pacta SaaS that's a blocker:
// Personal Orgs are paying customers who need to upgrade Free → Pro.
// Overlay 049 makes the org switcher universal. Other `isPersonalLayout`
// call sites (nav/command-menu/billing-portal-button) keep their default
// behavior; only the menu-switcher swap matters for billing reachability.
import { OrgMenuSwitcher } from './org-menu-switcher';

export type HeaderProps = HTMLAttributes<HTMLDivElement>;

export const Header = ({ className, ...props }: HeaderProps) => {
  const params = useParams();

  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const { data: unreadCountData } = trpc.document.inbox.getCount.useQuery(
    {
      readStatus: ReadStatus.NOT_OPENED,
    },
    {
      // refetchInterval: 30000, // Refetch every 30 seconds
    },
  );

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'supports-backdrop-blur:bg-background/60 bg-background/95 sticky top-0 z-[60] flex h-16 w-full items-center border-b border-b-transparent backdrop-blur duration-200',
        scrollY > 5 && 'border-b-border',
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-x-4 px-4 md:justify-normal md:px-8">
        <Link
          to={getRootHref(params)}
          className="focus-visible:ring-ring ring-offset-background hidden rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:inline"
        >
          {/* MODIFIED for BizRethink overlay 026: bumped from h-6 to h-9
              — gives the wordmark proper presence in the admin nav. */}
          <BrandingLogo className="h-9 w-auto" />
        </Link>

        <AppNavDesktop setIsCommandMenuOpen={setIsCommandMenuOpen} />

        <Button asChild variant="outline" className="relative hidden h-10 w-10 rounded-lg md:flex">
          <Link to="/inbox" className="relative block h-10 w-10">
            <InboxIcon className="text-muted-foreground hover:text-foreground h-5 w-5 flex-shrink-0 transition-colors" />

            {unreadCountData && unreadCountData.count > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold">
                {unreadCountData.count > 99 ? '99+' : unreadCountData.count}
              </span>
            )}
          </Link>
        </Button>

        <div className="md:ml-4">
          {/* MODIFIED for BizRethink (overlay 049): always show full org switcher. */}
          <OrgMenuSwitcher />
        </div>

        <div className="flex flex-row items-center space-x-4 md:hidden">
          <button onClick={() => setIsCommandMenuOpen(true)}>
            <SearchIcon className="text-muted-foreground h-6 w-6" />
          </button>

          <button onClick={() => setIsHamburgerMenuOpen(true)}>
            <MenuIcon className="text-muted-foreground h-6 w-6" />
          </button>

          <AppCommandMenu open={isCommandMenuOpen} onOpenChange={setIsCommandMenuOpen} />

          <AppNavMobile
            isMenuOpen={isHamburgerMenuOpen}
            onMenuOpenChange={setIsHamburgerMenuOpen}
          />
        </div>
      </div>
    </header>
  );
};
