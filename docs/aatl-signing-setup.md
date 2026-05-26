# AATL-trusted Document Signing — DigiCert + GCP Cloud HSM Setup

**Status:** Planning → Procurement
**Started:** 2026-05-26
**Target completion:** ~2 weeks (DigiCert validation is the long pole now that D-U-N-S is in hand)
**All-in cost:** ~$525–$565/yr ($513/yr cert via reseller + $12–15/yr GCP HSM)

This document is the operational runbook for replacing Pacta's current self-signed signing certificate with an AATL-trusted DigiCert Document Signing certificate, with the private key held in Google Cloud KMS (HSM protection level). The result: Adobe Acrobat opens signed PDFs with a green checkmark and no "validity unknown" warning.

## Why this matters

Right now, Pacta signs contracts with a self-signed cert. Adobe Acrobat shows a warning banner on every signed PDF because the issuing CA isn't on Adobe's Approved Trust List (AATL). For early customers like CircularPay, this undermines the perceived legitimacy of every contract. A $525/yr investment removes the warning permanently.

## Why DigiCert + GCP HSM (vs SSL.com eSigner)

Researched 2026-05-26. Bottom line: at our projected volume (<2,000 docs/year in year 1), DigiCert + GCP HSM is the cheaper, cleaner long-term path. SSL.com eSigner becomes competitive once volume sustainably exceeds 2,000/year — at which point the migration cost is justified by the savings.

| Path | Year 1 cost | Pros | Cons |
|---|---|---|---|
| **DigiCert + GCP HSM** (chosen) | $525–565 | Unlimited signing up to 2,000/yr cap • Key sits in OUR GCP project (better fintech audit story) • No per-signature fees | 2-week setup • Need to handle CSR + attestation flow • Capped at 2,000 sigs/yr at this tier |
| SSL.com OV + eSigner Tier 1 | $479 base + overages | Zero infra ceremony • Self-serve | Per-signature overage fees ($1/sig past 20/mo) • Key sits in SSL.com's HSM • $500 one-time GCP HSM attestation fee if migrating later |
| GlobalSign DSS | $5,000+/yr (estimated) | Purpose-built automation product | Pricing hidden behind sales calls • Overkill for early stage |

## Reference data (filled in)

| Field | Value |
|---|---|
| **D-U-N-S number** | `11-364-0854` |
| **Legal entity** | Server Baba Inc |
| **DBA** | BizRethink AI (⚠️ see typo warning below) |
| **State of incorporation** | Florida |
| **Date incorporated** | 2019-08-11 |
| **Principal** | Shwet Prabhat (Principal) |
| **EIN** | (on file — pull from incorporation docs) |
| **Business address** | 29090 Picana Ln, Wesley Chapel, Florida 33543, United States |
| **Business phone** | (813) 331-5192 |
| **SIC Code** | 83999901 (Advocacy group — primary) |
| **GCP project (to create)** | `bizrethink-signing` |
| **GCP location** | `us-east4` (Northern Virginia — HSM-capable, low latency to Atlanta VPS) |
| **KMS keyring** | `pacta-signing` |
| **KMS key** | `pacta-doc-signing-key` |
| **KMS algorithm** | `rsa-sign-pkcs1-3072-sha256` (NOT 2048; future-proofs AATL) |
| **Service account** | `pacta-signer@bizrethink-signing.iam.gserviceaccount.com` |
| **Reseller (chosen)** | gogetssl.com (~60% cheaper than DigiCert direct) |
| **Order term** | 3-year prepaid (~$1,540 total = $513/yr; HSM Letter validates 825 days so covers first renewal) |
| **TSA URLs (already configured)** | `http://timestamp.digicert.com, http://timestamp.sectigo.com` |

## ⚠️ Action item BEFORE ordering: fix DBA typo in D&B

D&B currently shows DBA as "**BizRetink AI**" (missing the "h" between Bizr- and -etink). DigiCert pulls the DBA from D&B verbatim. **Fix the typo at https://www.dnb.com/duns-number/get-a-duns/profile-manager.html before submitting the DigiCert order**, otherwise every signed contract will display "BizRetink AI" forever.

After fixing, allow 1-3 business days for D&B to propagate the change to their verification API.

---

## Step-by-step

### Phase 1 — Pre-order prep (parallel work)

#### 1.1. Fix DBA typo in D&B *(do this first, blocking)*

- Log in to https://www.dnb.com/duns-number/get-a-duns/profile-manager.html
- Edit "Doing Business As" field: `BizRetink AI` → `BizRethink AI`
- Save, wait 1-3 business days for propagation

#### 1.2. Email DigiCert sales for written confirmation *(in parallel)*

```
To: sales@digicert.com
Subject: Pre-purchase verification — Document Signing (2000 Org) + GCP Cloud HSM

Hi,

Planning to purchase a Document Signing Certificate (Organization, 2000
annual signatures) via reseller (gogetssl.com) with provisioning set to
"Install on Existing HSM" targeting Google Cloud KMS (HSM protection level,
FIPS 140-2 Level 3).

Two things I need confirmed in writing before placing the order:

1. Certificate Subject rendering: For Server Baba Inc DBA BizRethink AI
   (Florida C-Corp, D-U-N-S 11-364-0854), can the cert subject render as
   `O=Server Baba Inc, OU=BizRethink AI`? Will the Florida DBA filing be
   accepted as assumed-name evidence?

2. HSM attestation fee: SSL.com charges $500 one-time for cloud HSM
   attestation review. Does DigiCert's HSM Audit Letter procedure cover
   Google Cloud HSM at no separate add-on fee?

Thanks,
Shwet Prabhat
Principal, Server Baba Inc
```

#### 1.3. Set up GCP project + KMS key *(30 min, no waiting on anyone)*

```bash
# Project + billing
gcloud projects create bizrethink-signing --name="BizRethink Signing"
gcloud config set project bizrethink-signing
gcloud beta billing projects link bizrethink-signing --billing-account=<YOUR_BILLING_ID>

# Required APIs
gcloud services enable cloudkms.googleapis.com iam.googleapis.com iamcredentials.googleapis.com

# Keyring (regional only — Cloud HSM does not support multi-region)
gcloud kms keyrings create pacta-signing --location=us-east4

# HSM-backed RSA 3072 key
# Why RSA 3072 not 2048: Adobe AATL tightens minimums over time; 3072
# future-proofs through one full renewal without forcing an algorithm
# migration. RSA 4096 also works but signing latency is ~3x slower on
# HSM with no real benefit at our volume.
gcloud kms keys create pacta-doc-signing-key \
  --location=us-east4 --keyring=pacta-signing \
  --purpose=asymmetric-signing \
  --default-algorithm=rsa-sign-pkcs1-3072-sha256 \
  --protection-level=hsm

# Wait 30-90 seconds for the key version to reach ENABLED state
gcloud kms keys versions list \
  --location=us-east4 --keyring=pacta-signing --key=pacta-doc-signing-key

# Service account with LEAST privilege
gcloud iam service-accounts create pacta-signer \
  --display-name="Pacta automated document signer"

# Two role bindings — signer + publicKeyViewer are the only runtime needs
# for @libpdf/core's GoogleKmsSigner (asymmetricSign + getPublicKey calls).
gcloud kms keys add-iam-policy-binding pacta-doc-signing-key \
  --location=us-east4 --keyring=pacta-signing \
  --member=serviceAccount:pacta-signer@bizrethink-signing.iam.gserviceaccount.com \
  --role=roles/cloudkms.signer

gcloud kms keys add-iam-policy-binding pacta-doc-signing-key \
  --location=us-east4 --keyring=pacta-signing \
  --member=serviceAccount:pacta-signer@bizrethink-signing.iam.gserviceaccount.com \
  --role=roles/cloudkms.publicKeyViewer

# SA key download — paste into Pacta admin, then archive in 1Password
gcloud iam service-accounts keys create pacta-signer-sa.json \
  --iam-account=pacta-signer@bizrethink-signing.iam.gserviceaccount.com

# Confirm the full key version path for later use
echo "projects/bizrethink-signing/locations/us-east4/keyRings/pacta-signing/cryptoKeys/pacta-doc-signing-key/cryptoKeyVersions/1"
```

#### 1.4. Set GCP billing alert

GCP cost at our volume: $1/mo for the key + ~$0.001/yr for signing ops. Set a budget alert at $25/mo to catch any surprise:

```bash
gcloud billing budgets create \
  --billing-account=<BILLING_ID> \
  --display-name="bizrethink-signing alert" \
  --budget-amount=25USD \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100
```

### Phase 2 — Order the cert

#### 2.1. Place order *(after DigiCert sales confirmation arrives)*

- URL: https://www.gogetssl.com/digicert/docsign-organization/
- Product: **Document Signing — Organization (2000)** — confirms 2,000 annual signature ceiling at this tier
- Term: **3-year prepaid** (~$1,540 total = $513/yr amortized)
- Provisioning method: **Install on Existing HSM**
- Subject details:
  - **Common Name:** `Server Baba Inc`
  - **Organization:** `Server Baba Inc`
  - **Organizational Unit:** `BizRethink AI`
  - **Country:** `US`
  - **State:** `Florida`
  - **Locality:** `Wesley Chapel`

#### 2.2. Upload validation docs

DigiCert will request:
- Florida Articles of Incorporation (Server Baba Inc)
- Florida Fictitious Name filing (BizRethink AI DBA)
- EIN letter (CP575) or recent IRS notice
- D-U-N-S number: **11-364-0854**
- Physical address: 29090 Picana Ln, Wesley Chapel, Florida 33543
- Org-listed callback phone: (813) 331-5192 — must be findable in a public directory

Expected timeline: 3-7 business days for OV validation, +1-2 days for DBA verification.

### Phase 3 — CSR generation + HSM attestation

#### 3.1. Generate CSR with KMS key

Use the `mattes/google-cloud-kms-csr` Go tool — de-facto standard for this flow.

```bash
git clone https://github.com/mattes/google-cloud-kms-csr
cd google-cloud-kms-csr
go build -o csr .

export GOOGLE_APPLICATION_CREDENTIALS=$PWD/pacta-signer-sa.json

./csr \
  -key projects/bizrethink-signing/locations/us-east4/keyRings/pacta-signing/cryptoKeys/pacta-doc-signing-key/cryptoKeyVersions/1 \
  -common-name "Server Baba Inc" \
  -organization "Server Baba Inc" \
  -organizational-unit "BizRethink AI" \
  -country "US" -state "Florida" -locality "Wesley Chapel" \
  -out pacta-doc-signing.csr

# Verify the CSR
openssl req -in pacta-doc-signing.csr -text -noout | head -20
```

#### 3.2. Generate HSM attestation bundle

```bash
# Download attestation .dat
gcloud kms keys versions describe 1 \
  --key=pacta-doc-signing-key --keyring=pacta-signing --location=us-east4 \
  --attestation-file=pacta-attestation.dat
```

⚠️ **Use the `.zip` bundle from GCP Console, not the raw `.dat`.** DigiCert's validation tooling expects the bundle format. To get it:

1. GCP Console → Security → Key Management → `pacta-signing` keyring → `pacta-doc-signing-key` → version 1
2. Click "Verify attestation" → "Download attestation bundle"
3. Saves as `pacta-attestation.zip`

#### 3.3. Submit CSR + attestation to DigiCert

Via CertCentral order ticket: upload `pacta-doc-signing.csr` and `pacta-attestation.zip`.

### Phase 4 — HSM Audit Letter

DigiCert emails a 1-page liability letter — sign it (acknowledging GCP Cloud HSM is FIPS 140-2 Level 3), email it back, accept the verification phone call.

Letter validates for **825 days** → first renewal needs only a re-verification call, no new letter.

### Phase 5 — Receive cert + install in Pacta

#### 5.1. Assemble cert chain

DigiCert delivers leaf cert + intermediate(s) + root via CertCentral.

```bash
# Order: leaf first, root last
cat leaf.pem intermediate.pem root.pem > pacta-chain.pem

# Verify chain
openssl verify -CAfile root.pem -untrusted intermediate.pem leaf.pem
# Expect: leaf.pem: OK

# Inspect leaf details
openssl x509 -in leaf.pem -text -noout | head -30
# Confirm: Subject contains "Server Baba Inc" + "BizRethink AI",
#          Issuer is DigiCert, key usage includes digitalSignature + nonRepudiation
```

#### 5.2. Wire into Pacta admin

1. Open Pacta admin → Settings → Signing Config
2. Switch radio from `Local cert (P12)` to **Google Cloud HSM**
3. Paste:
   - **kmsKeyPath**: `projects/bizrethink-signing/locations/us-east4/keyRings/pacta-signing/cryptoKeys/pacta-doc-signing-key/cryptoKeyVersions/1`
   - **gcloudCredentialsJson**: full contents of `pacta-signer-sa.json`
   - **gcloudCertChainPem**: full contents of `pacta-chain.pem`
4. Click **"Test connection"** — should: (a) parse SA JSON, (b) fetch public key from KMS, (c) verify public key matches the leaf cert, (d) attempt dry-run `asymmetricSign`. If any step fails, do NOT save — diagnose first.
5. Save.

#### 5.3. Smoke test in Adobe Acrobat

1. Send a one-page test contract to a personal email
2. Sign it from the signer link
3. Download the signed PDF, open in Adobe Acrobat Reader
4. Verify:
   - ✅ Green checkmark
   - ✅ "Signed and all signatures are valid"
   - ✅ Cert path shows DigiCert root in AATL
   - ✅ RFC 3161 timestamp from `timestamp.digicert.com`

Cross-check with `pdfsig` (poppler-utils):
```bash
pdfsig signed-test.pdf
# Expect: "Signature Validation: Signature is Valid."
```

### Phase 6 — Audit logging for compliance

Enable Cloud Audit Logs for every KMS signing op, ship to Axiom:

```bash
# Create a sink that forwards KMS audit events to Axiom
gcloud logging sinks create pacta-kms-axiom \
  pubsub.googleapis.com/projects/bizrethink-signing/topics/axiom-ingest \
  --log-filter='resource.type="cloudkms_cryptokeyversion" AND protoPayload.methodName="AsymmetricSign"'

# Wire the pubsub topic → Axiom via the existing axiom ingest pipeline
# (same pattern as other Pacta logs)
```

Retain 7 years for fintech compliance posture.

---

## Operational housekeeping

### Renewal

- DigiCert sends notices at 90 / 60 / 30 / 7 days before expiry
- **Set calendar reminder 60 days before expiry** (cert silently breaks AATL trust at expiry; signatures made before expiry remain valid via TSA timestamping, which is why TSA is non-negotiable)
- Renew process: re-run CSR generation against the **same KMS key**, submit; HSM Letter is valid 825 days so first renewal needs only a re-verification call

### Key rotation

- Rotate every 3 years at cert renewal, not more often
- Process:
  ```bash
  gcloud kms keys versions create --key=pacta-doc-signing-key \
    --keyring=pacta-signing --location=us-east4
  ```
  Then generate fresh CSR + attestation with new version, get new cert, swap kmsKeyPath in `/admin/signing` to `cryptoKeyVersions/2`

⚠️ **Leave old key versions DISABLED, not DESTROYED.** Verifying historical signatures requires the old public key (fetchable as long as version isn't destroyed). `DESTROYED` is irreversible and bricks signature verification on contracts signed with the old key.

### Backups

| Artifact | Where to back up | Recoverable? |
|---|---|---|
| Cert chain PEM | 1Password "Pacta Signing" vault | Re-downloadable from DigiCert CertCentral anytime |
| Service account JSON | 1Password "Pacta Signing" vault | Re-generate via `gcloud iam service-accounts keys create` |
| GCP KMS HSM private key | **Cannot be backed up** (by design) | If lost, must re-issue cert with new key |
| Attestation bundle .zip | 1Password "Pacta Signing" vault | Google does NOT regenerate — archive this once for any future compliance audit |

### Service account JSON leak response

```bash
# List current SA keys
gcloud iam service-accounts keys list \
  --iam-account=pacta-signer@bizrethink-signing.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create pacta-signer-sa-new.json \
  --iam-account=pacta-signer@bizrethink-signing.iam.gserviceaccount.com

# Delete the leaked key
gcloud iam service-accounts keys delete <OLD_KEY_ID> \
  --iam-account=pacta-signer@bizrethink-signing.iam.gserviceaccount.com
```

Paste new JSON in `/admin/signing`. Because SA only has `signer + publicKeyViewer` on a single key, blast radius is "attacker could sign arbitrary content with our cert until rotation" — bad but bounded. No cert revocation needed unless evidence of actual misuse.

### Cert compromise response

If you have evidence the cert was compromised (not just SA JSON leak — actual cert misuse):

1. DigiCert CertCentral → cert dashboard → "Revoke" → reason `keyCompromise`
2. CRL update within 24h, OCSP within minutes
3. Contracts signed BEFORE revocation remain valid if they have a valid TSA timestamp predating the revocation (this is the entire reason `timestamp.digicert.com` is wired in)
4. Notify any counterparties who relied on post-compromise signatures
5. Re-issue cert with new key (Phase 3 + 4 again)

---

## Compliance notes

- **AATL** — confirmed via Adobe's published trust list; DigiCert Document Signing Org tier is explicitly designed to meet AATL technical requirements (KU = `digitalSignature` + `nonRepudiation`, EKU = `id-kp-emailProtection` and/or `id-kp-documentSigning`)
- **eIDAS** — DigiCert's chain qualifies as Advanced Electronic Signature (AES) for EU interop. Not Qualified (QES) — that requires an EU NTR identifier we don't have, and isn't needed for US fintech use case.
- **ESIGN Act + UETA** — Both satisfied by any AATL cert + audit trail + intent-to-sign capture (Documenso flow already provides intent capture)
- **Fintech (CircularPay MCA contracts)** — combo of AATL + RFC 3161 timestamp + Cloud Audit Log retention is well above the bar for SOC 2 future posture

---

## Things easy to miss

- ⚠️ **DBA typo in D&B** (BizRetink → BizRethink) — fix BEFORE ordering
- ⚠️ **Subject CN format** — DigiCert may NOT render "Server Baba Inc DBA BizRethink AI" as a single CN string. Most likely: `CN=Server Baba Inc, O=Server Baba Inc, OU=BizRethink AI`. Confirm with sales pre-order.
- ⚠️ **2,000 sig/yr is honor-system** at this cert tier — not technically enforced. If you cross it, you can renew normally — but DigiCert may push to upgrade tier on next renewal.
- ⚠️ **Never `DESTROY` an old KMS key version after rotation** — set to `DISABLED` instead. Verifying signatures on contracts signed with the old key requires the old public key.
- ⚠️ **TSA is non-negotiable** — Pacta config already has `timestamp.digicert.com` (free for DigiCert cert holders). Without TSA, contracts become "validity unknown" the moment the cert expires.
- ⚠️ **GCP Cloud HSM is regional only** — do NOT use multi-region locations (`us`, `global`); use `us-east4` specifically
- ⚠️ **Key generation takes 30-90 seconds** — `gcloud kms keys create` returns before the version is `ENABLED`; wait and verify with `gcloud kms keys versions list`

---

## Timeline

| Phase | Effort | Calendar time | Blocks on |
|---|---|---|---|
| 1.1 Fix DBA typo in D&B | 5 min | 1-3 business days (D&B propagation) | nothing |
| 1.2 Email DigiCert sales | 5 min | 1-2 business days (sales response) | nothing |
| 1.3 GCP project + KMS setup | 30 min | immediate | nothing |
| 1.4 GCP billing alert | 5 min | immediate | nothing |
| 2.1-2.2 Place order + upload docs | 1 hr | 3-7 business days (OV validation) | DBA fix propagated, sales confirmation |
| 3 Generate CSR + attestation | 1 hr | immediate (during validation wait) | KMS key created |
| 4 HSM Audit Letter | 30 min | 1-2 business days (callback) | DigiCert validation complete |
| 5.1-5.2 Install cert in Pacta | 30 min | immediate | DigiCert delivers cert |
| 5.3 Smoke test in Acrobat | 30 min | immediate | Pacta cert installed |
| 6 Audit logging setup | 1 hr | immediate | post-launch hardening |
| **TOTAL** | **6-10 hrs work** | **~2 weeks calendar** | |

---

## Sources

- [DigiCert Compare Document Signing Certificates](https://www.digicert.com/signing/compare-document-signing-certificates)
- [DigiCert order doc — Document Signing for Organization](https://docs.digicert.com/en/certcentral/manage-certificates/document-signing-certificates/order-you-document-signing-for-business-group-certificate.html)
- [DigiCert HSM Letter procedure](https://knowledge.digicert.com/general-information/hsm-letter-procedure-authentication)
- [GoGetSSL DigiCert Document Signing pricing](https://www.gogetssl.com/digicert/docsign-organization/)
- [Google Cloud KMS pricing](https://cloud.google.com/kms/pricing)
- [Google docs — Cloud KMS locations (HSM regions)](https://docs.cloud.google.com/kms/docs/locations)
- [Google docs — Verifying attestations](https://docs.cloud.google.com/kms/docs/attest-key)
- [mattes/google-cloud-kms-csr GitHub](https://github.com/mattes/google-cloud-kms-csr)
- [Adobe AATL members list](https://helpx.adobe.com/acrobat/kb/approved-trust-list1.html)
- [SSL Store — Google KMS CSR + Attestation guide](https://www.thesslstore.com/knowledgebase/knowledge-base/google-kms-csr-and-attestation/)
