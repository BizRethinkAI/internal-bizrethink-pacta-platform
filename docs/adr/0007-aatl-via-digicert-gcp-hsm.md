# ADR 0007 — AATL trust via DigiCert + GCP Cloud HSM

- **Status:** Accepted, not yet implemented (retrospective — records existing intent)
- **Date recorded:** 2026-08-29
- **Decision date:** 2026-05-26
- **Confirmed still live:** 2026-08-29

## Context

Pacta signs PDFs cryptographically (CAdES / PKCS#7, with optional Time Stamp
Authority and Long-Term Validation). Without a certificate chaining to a member
of **Adobe's Approved Trust List**, Adobe Reader shows *"signature validity is
unknown"* — which for a counterparty opening a contract reads as a warning about
the document.

## Decision

Obtain an AATL-trusted document-signing certificate from **DigiCert**, with the
private key held in **Google Cloud HSM** (Cloud KMS), RSA 3072.

- **DigiCert over SSL.com eSigner** for a documented, auditable HSM-attestation
  path rather than a proprietary remote-signing service.
- **RSA 3072 over 2048** because Adobe tightens minimums over time; 3072
  survives a renewal cycle without an algorithm migration.
- **Over 4096** because signing latency is roughly 3× on HSM for no practical
  benefit at this volume.
- **Cloud HSM over a local P12** because an AATL certificate must demonstrably
  live in hardware.

The full runbook is `docs/aatl-signing-setup.md`.

## Status and honesty about it

**This records a decision, not a completed implementation.** As of 2026-08-29 the
certificate has not been ordered; 2 of 7 setup tasks are done. A blocking item
remains: a DBA typo in the Dun & Bradstreet record must be corrected before
DigiCert will validate the organisation.

The signing code already supports a Google Cloud KMS transport
(`packages/signing/transports/google-cloud.ts`), so the change is operational
rather than architectural.

## Consequences

Signed documents will validate green in Adobe Reader without the recipient
installing anything. Ongoing costs are the DigiCert certificate and GCP Cloud
HSM key.

This is **complementary to, not a replacement for, the eIDAS AES positioning** —
AATL is about how Adobe renders trust; eIDAS AES is about the legal character of
the signature.

## Revisit when

The certificate is ordered and installed — at which point a follow-up ADR records
what actually happened, including anything this one got wrong.
