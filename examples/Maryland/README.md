# ADEPT (BPM044685) - SOO Example

## Overview
This repo shows a conversion of Maryland DoIT’s task-heavy RFP for “Agile Digital Experience Product Transformation (ADEPT)” into an outcome-focused Statement of Objectives (SOO). The SOO preserves the RFP’s real non-negotiables (data residency, accessibility, security, quality gates, cost caps, State ownership of code) but removes prescriptive “how” instructions so vendors can propose better methods.

## Original RFP Analysis
**Client:** Maryland Department of Information Technology (State government)  
**Solicitation:** BPM044685 (Issue date 6/4/24)  
**Original Project Type:** Multi-work-order agile delivery contract for design, development, testing, accessibility, DevSecOps, analytics, and related services  
**SOO Focus:** Measurable user and organizational outcomes delivered iteratively, with enforceable acceptance thresholds

### Current problems (implied by requirements)
- Inconsistent delivery quality across agencies and products, requiring a measurable “Definition of Done” and repeatable controls.
- Accessibility risk high enough to drive strict audit, remediation, and validation requirements prior to go-live.
- Need for statewide consistency and patterns (explicitly leveraging USWDS).
- Need for evidence-led prioritization: user research, usability testing, and analytics are baked into delivery expectations.
- Need to avoid lock-in: State-owned repos/artifacts and ability for State to purchase software/hosting from other sources.

### Desired outcomes (hidden in requirements)
- People can complete government tasks online more easily (user-centered design and plain language).
- Accessible services that work for assistive technology users and mobile users.
- Faster, safer change delivery (CI/CD, zero downtime deployment intent, automated tests).
- Defect reduction via measurable engineering practices (90% test coverage, linting, vulnerability thresholds).
- Better platform decisions via CMS alternatives assessment for feasibility.

### User groups
- Maryland residents and businesses using State services.
- State agency program staff and content owners.
- DoIT product teams and operational staff who must run and maintain services.

### Constraints
- No processing or storage of State data outside the continental U.S.
- Hardware and software costs cannot exceed 30% of total contract value; materials passed through with no markup.
- Contractor must follow applicable State policies/standards (Digital Services Playbook, MD SDLC, IT Security Policy, Digital Accessibility Policy).
- State requires State-controlled versioned code repository in the government domain.
- Open source can be proposed, but the vendor must provide operational support.
- SLA can be defined at the work order level.

### Success metrics (explicit examples)
- Minimum 90% test coverage for delivered code.
- 0 linting errors and 0 warnings for front-end code.
- WCAG 2.1 AA: 0 errors in automated scanning and 0 errors in manual testing (example tooling includes Pa11y).
- Security: free of medium and high static/dynamic vulnerabilities aligned to OWASP ASVS 4.0 Level 2.
- User research artifacts available at the end of each applicable sprint.

## Key Transformation Insights

### What Changed from RFP to SOO
**Original RFP Language (task/deliverable framing):**
- “Contractor shall develop software…” and enumerated activity lists (testing, design, integration, etc.).
- Deliverable tables specifying artifacts (tested code, documented code, security tests, research artifacts).

**SOO Transformation (outcome framing):**
- Converted “shall develop” into “users can complete priority tasks online with fewer errors and less time.”
- Converted deliverable lists into acceptance outcomes: measurable quality gates (test coverage, linting, staging deploy, vulnerability thresholds),
  plus audit evidence (accessibility reports and validation results).
- Kept constraints that protect the buyer (data residency, cost boundaries, State ownership of code) while removing tool-stack prescriptions
  except where the RFP itself uses them as examples.

### Compliance and Constraints
- **Accessibility:** Audit report demonstrating WCAG 2.1 conformance prior to go-live, including automated + manual testing and a remediation timeline.
- **Security:** OWASP ASVS 4.0 Level 2 as a baseline, plus “no medium/high vulnerabilities” as an acceptance expectation.
- **Data residency:** No international processing or storage for State data.
- **Procurement boundaries:** Hardware/software spend capped at 30% of contract value; materials pass-through without markup.
- **Governance:** Work-order-level definition of specifics (tech stack, SLA, user recruitment), enabling flexibility while retaining baseline quality.

## Expected Vendor Innovation
This SOO enables vendors to propose:
- Better ways to measure and improve task success and user satisfaction (not just ship features).
- Superior delivery pipeline approaches that meet the same reliability and quality outcomes with less risk.
- Different architecture/platform approaches (including OSS/COTS/SaaS) that still satisfy State ownership, observability, and compliance constraints.

## Success Metrics (recommended in SOO usage)
- Task success rate and time-on-task reductions for priority user journeys.
- Accessibility conformance: audit pass rates, defect density, and remediation cycle time.
- Reliability: deployment frequency with minimal/no downtime, incident/error rates, and mean time to recovery.
- Quality: test coverage baseline maintained, defect escape rate, and change failure rate.
- Security: vulnerability counts by severity and time-to-remediate.

## Files Included
- `inputs.yml` - Complete SOO Wizard session data
- `README.md` - This documentation

## Next Steps
1. Import `inputs.yml` into SOO Wizard
2. Tailor objectives to the first 1–2 work orders (pick target services and top journeys)
3. Confirm acceptance gates with DoIT legal, security, and accessibility stakeholders
4. Publish SOO and vendor instruction pack