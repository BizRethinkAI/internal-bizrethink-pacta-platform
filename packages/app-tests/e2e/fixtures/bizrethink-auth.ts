import type { Page } from '@playwright/test';

import { seedUser } from '@documenso/prisma/seed/users';

import { apiSignin } from './authentication';

/**
 * Signs in a freshly-seeded instance-admin user and navigates to a target
 * path. Returns the seeded user for any follow-up DB assertions.
 *
 * Uses upstream's seedUser with isAdmin: true (which sets Role.ADMIN +
 * Role.USER). Combined with apiSignin's cookie-based auth, the page is
 * ready to navigate to any /admin/* route.
 *
 * Usage:
 *   const { user, team } = await signedInAsAdmin({ page, redirectPath: '/admin/site-settings' });
 *   await expect(page).toHaveURL(/\/admin\/site-settings/);
 *
 * See COVERAGE-PLAN-2026-05-25.md §6 T4.
 */
export const signedInAsAdmin = async ({
  page,
  redirectPath = '/admin',
  passwordOverride,
}: {
  page: Page;
  redirectPath?: string;
  passwordOverride?: string;
}) => {
  const password = passwordOverride ?? 'password';
  const seeded = await seedUser({ isAdmin: true, password });

  await apiSignin({
    page,
    email: seeded.user.email,
    password,
    redirectPath,
  });

  return seeded;
};
