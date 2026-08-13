/**
 * Whether the first-run "Welcome to Pacta" onboarding modal should auto-open.
 *
 * Opens only for a not-yet-dismissed user AND only in the main app — never on
 * the /admin panel. Onboarding ("send your first document", etc.) is irrelevant
 * to an admin doing administration, and the modal would overlay admin dialogs
 * (it was covering the org-delete "Danger Zone", blocking the admin
 * delete-organisation flow). Pure + client-safe for easy unit testing.
 */
export function shouldAutoOpenOnboarding(pathname: string, dismissed: boolean, isAutomated = false): boolean {
  if (dismissed) {
    return false;
  }

  // Never for automated browsers (Playwright/Selenium/etc. set
  // navigator.webdriver=true). A 500ms-delayed modal popping over the page
  // races every E2E that interacts with a fresh-user page (command menu,
  // admin, settings). Real users never set this flag. Bots don't need
  // onboarding either.
  if (isAutomated) {
    return false;
  }

  // Never on the admin panel — irrelevant to admins, and it overlays admin
  // dialogs (it was covering the org-delete "Danger Zone").
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return false;
  }

  // Never on settings pages — the modal would cover the org/team "Danger Zone"
  // Delete controls and interrupt deliberate configuration work.
  if (pathname.includes('/settings')) {
    return false;
  }

  return true;
}
