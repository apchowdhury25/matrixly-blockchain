# SOC 2 investigation

**This is not a SOC 2 report.** Matrixly Trust is **not** SOC 2 Type I or Type II certified. REG-01 stays `not-claimed`.

SOC 2 is an **AICPA attestation**. Only a licensed CPA firm can issue the report. Shipping cryptographic controls is not the same as receiving an opinion.

## What SOC 2 actually is

| Term | Meaning |
|---|---|
| Trust Services Criteria (TSC) | AICPA 2017 criteria, points of focus revised 2022: Security, Availability, Processing Integrity, Confidentiality, Privacy |
| Security | **Required** in every SOC 2. Common Criteria **CC1–CC9** |
| A / PI / C / P | Optional categories you add to scope |
| Type I | Design of controls at a **point in time** |
| Type II | Design **and operating effectiveness** over a period (typically 3–12 months) |
| Report | Restricted-use auditor opinion + management’s system description — not a certificate badge |

There is no “SOC 2 compliant software.” There is a **service organization** (the company operating Matrixly) whose controls an auditor examines.

## Type I vs Type II

Type I asks: are the controls **designed** and in place on this date?

Type II asks: did those controls **operate** as described for the whole window? Evidence is tickets, access reviews, incident records, backup restore tests, change logs — not a green unit test from one night.

Banks and governments almost always want **Type II**.

## Mapping (honest)

Live table: **SOC 2** in the product (`/soc2`). Source: `src/lib/compliance/soc2.ts`.

Coverage values:

| Coverage | Meaning |
|---|---|
| `software-support` | This repository implements something an auditor could *sample* as technical evidence |
| `organization-gap` | A CPA will still ask the **operator** for people, policy, and period evidence |
| `not-in-scope` | We do not put this category in a hypothetical SOC 2 scope yet |

Processing integrity (PI1) is the closest fit to the product: a verifier must not return VALID when a cryptographic check failed. That still does not issue a SOC 2 report.

## What an auditor will still demand (none of this is in git)

1. System description (boundaries, subservice organizations, complementary user-entity controls)
2. Information security policy, acceptable use, incident response, change management, vendor management
3. Access reviews (joiners/movers/leavers) over the period
4. MFA on production, including the cloud console
5. Vulnerability scans / pen test
6. Backup restore test
7. Background checks / security training logs
8. Board or management risk review minutes
9. Signed CPA engagement letter

## What we will not do

- Flip REG-01 to `implemented`
- Put “SOC 2 certified” on the Compliance page
- Treat this markdown as an audit opinion

## Sources

- AICPA TSC 2017 with 2022 points of focus: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- AICPA SOC suite: https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services
