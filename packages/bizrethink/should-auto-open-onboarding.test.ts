import { describe, expect, it } from 'vitest';

import { shouldAutoOpenOnboarding } from './should-auto-open-onboarding';

/**
 * Regression guard (2026-08-13): the "Welcome to Pacta" onboarding modal
 * (onboarding-dialog.tsx, rendered in the authenticated layout) was auto-opening
 * on EVERY authenticated page — including the /admin panel, where it covered
 * admin dialogs (e.g. the org-delete "Danger Zone"), making the admin
 * delete-organisation e2e flow un-clickable. Onboarding is for regular users in
 * the main app, never for admins doing admin work.
 */
describe('shouldAutoOpenOnboarding', () => {
  it('opens for a new user on main-app pages', () => {
    expect(shouldAutoOpenOnboarding('/', false)).toBe(true);
    expect(shouldAutoOpenOnboarding('/documents', false)).toBe(true);
    expect(shouldAutoOpenOnboarding('/t/acme/documents', false)).toBe(true);
    expect(shouldAutoOpenOnboarding('/inbox', false)).toBe(true);
  });

  it('never opens once dismissed', () => {
    expect(shouldAutoOpenOnboarding('/', true)).toBe(false);
    expect(shouldAutoOpenOnboarding('/documents', true)).toBe(false);
  });

  it('never opens on the admin panel (would cover admin dialogs)', () => {
    expect(shouldAutoOpenOnboarding('/admin', false)).toBe(false);
    expect(shouldAutoOpenOnboarding('/admin/organisations/abc123', false)).toBe(false);
    expect(shouldAutoOpenOnboarding('/admin/users', false)).toBe(false);
  });

  it('never opens on settings pages (would cover org/team Danger Zone Delete)', () => {
    expect(shouldAutoOpenOnboarding('/o/acme/settings', false)).toBe(false);
    expect(shouldAutoOpenOnboarding('/o/acme/settings/members', false)).toBe(false);
    expect(shouldAutoOpenOnboarding('/t/acme/settings', false)).toBe(false);
    expect(shouldAutoOpenOnboarding('/settings/profile', false)).toBe(false);
  });

  it('never opens for automated browsers (navigator.webdriver) — kills E2E flake', () => {
    // Would otherwise open on a main-app page for a new user, but automation
    // flag suppresses it.
    expect(shouldAutoOpenOnboarding('/', false, true)).toBe(false);
    expect(shouldAutoOpenOnboarding('/documents', false, true)).toBe(false);
    // Still opens for real users (isAutomated defaults to false).
    expect(shouldAutoOpenOnboarding('/', false, false)).toBe(true);
    expect(shouldAutoOpenOnboarding('/documents', false)).toBe(true);
  });
});
