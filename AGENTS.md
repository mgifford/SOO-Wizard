# AGENTS.md

## Project Purpose
SOO Wizard is a client-side web application that guides federal procurement professionals through creating outcome-focused Statements of Objectives (SOO) for digital services acquisitions. The wizard enforces best practices for performance-based contracting by preventing task-based language and ensuring compliance with federal acquisition principles.

The project prioritizes clarity, correctness, accessibility, and procurement compliance. It assists users in creating well-formed SOO documents, but does not constitute legal or procurement advice. Final responsibility for acquisition decisions rests with the user and their acquisition team.

## Audience and Responsibility
This project is intended for federal procurement professionals, contracting officers, and program managers who need to develop Statements of Objectives for digital services contracts.

Outputs are guidance and draft documents. This tool does not replace acquisition planning, legal review, or contracting officer approval. Users remain responsible for ensuring their SOO meets agency-specific requirements, FAR compliance, and contracting authority approval.

The wizard enforces outcome-based language patterns but cannot guarantee contract success or compliance with all applicable regulations. Users must validate outputs against their specific procurement context.

## Scope
The project consists of:
- Static HTML, CSS, and JavaScript (no build step required)
- A client-side wizard-style UI with 12 progressive steps
- YAML-based configuration for workflow, lint rules, and AI prompts
- Integration with AI services (Ollama local or Google Gemini cloud) for draft generation
- Client-side linting engine to enforce outcome-based language
- Multiple export formats (Markdown, HTML, RTF) with complete audit trail
- Session restore capability via inputs.yml import

### AI Availability and Modes
- AI config loads from config.json (endpoint, model, timeout).
- When hosted on GitHub Pages, localhost AI endpoints are disabled (not reachable from github.io). Use a cloud-accessible endpoint instead.
- If no reachable AI endpoint is configured, the wizard automatically runs in Prompt mode (no API calls) while keeping all features editable.
- The page title and header reflect the current mode: “AI Wizard” vs “Prompt Wizard”.

No server-side processing is required. All data processing, validation, and AI integration happens in the browser or via client-initiated API calls to configured endpoints.

## UI Contract (Wizard Pattern)
The wizard UI must be honest, predictable, and accessible.

Rules:
- Steps must be clearly identified and numbered (1-12).
- Users must be able to review and change previous answers via step navigation.
- Progress indicators must reflect actual state, not assumptions.
- The UI must not skip steps silently or auto-advance without user intent.
- Auto-save occurs after every field change; users can restore sessions via export/import.
- Lint violations must block progression at designated "gate" steps (SOO Inputs, Methodology).
- AI-generated content must be editable; users are never locked into AI output.

No UI element may imply certainty or correctness beyond what the inputs justify.

### Wizard Steps (Overview)
1. **Introduction** – Context and usage guidance
2. **Readiness Assessment** – Product Owner, end-user access, approval cycles
3. **Readiness Results** – Auto-scored guidance (STRONG/MEDIUM/LOW based on pattern matching "Yes" in PO and end-user access answers)
4. **Product Vision Board** – 3-5 year vision, target users, needs, outcomes
5. **Product Positioning** – Geoffrey Moore positioning template
6. **SOO Inputs** – Problem context, objectives, constraints (LINT GATE)
7. **Methodology** – Contract context, budget, outcomes/evidence/governance (LINT GATE)
8. **SOO Review Gate** – 5 required acknowledgment checkboxes
9. **Generate SOO** – AI draft generation or manual workflow
10. **Critical Review** – AI-generated review questions + draft editing
11. **PWS Vendor Pack** – Auto-generated vendor instruction document
12. **Export Center** – Download ZIP bundle with outputs + audit trail

## Accessibility Position
Accessibility is a core requirement for this project.

The project aims to follow WCAG 2.2 AA patterns where feasible, but does not claim formal conformance unless explicitly stated.

Accessibility work focuses on:
- Preventing common barriers
- Supporting keyboard and assistive technology users
- Making limitations explicit when they exist

## Accessibility Expectations (Minimum Bar)
Contributors and agents must ensure:

### Keyboard and Focus
- All interactive elements are reachable by keyboard.
- Logical tab order matches the visual step order.
- Visible focus indicators are preserved.
- No keyboard traps exist within wizard steps.

### Structure and Semantics
- One `<h1>` per page.
- Each wizard step has a clear heading.
- Use native HTML controls (`button`, `input`, `select`, `fieldset`, `legend`) wherever possible.
- Avoid div-based custom controls unless absolutely necessary.

### Labels, Instructions, and Errors
- Every input has a programmatic label.
- Instructions are associated with inputs when needed.
- Validation errors are:
  - Shown in text
  - Programmatically associated with the relevant input
  - Clear about what needs to be fixed

### Dynamic Updates
- Step changes and result updates must be announced appropriately (e.g., `aria-live` or `role="status"`).
- Progress indicators must be perceivable without relying on color alone.

### Touch and Pointer Use
- Controls must be large enough and spaced to avoid accidental activation.
- No interaction should rely solely on hover or precise pointer movement.

## Error Handling and Reliability
- No step may fail silently.
- Invalid input must block progression with a clear explanation.
- Unexpected errors must be surfaced to the user in plain language.
- If state cannot be restored, the user must be informed.

## Data Handling and Privacy
- Do not collect or transmit personal data unless explicitly required and documented.
- Any use of localStorage or similar must be documented and minimal.
- Do not include analytics or tracking by default.

## Dependencies
- Prefer minimal, well-understood dependencies.
- Avoid external scripts with unclear provenance.
- Document any third-party libraries or APIs used, including purpose and failure behavior.
- Do not commit secrets or API keys.

## Testing Expectations
Manual testing is required for every meaningful change:
- Keyboard-only walkthrough of the full wizard
- Verification of focus visibility at every step
- Validation error handling review
- Zoom testing (up to 200%)
- Basic screen reader spot check for step changes and results

Automated testing is encouraged but does not replace manual checks.

## Key Files and Architecture

### Core Application Files
- **[index.html](index.html)** – Main page, minimal scaffolding, loads USWDS and app_v2.js
- **[app_v2.js](app_v2.js)** – Complete wizard logic (2900+ lines): state management, step rendering, linting, AI integration, export generation
- **[styles.css](styles.css)** – Custom styles layered on USWDS, including theme toggle and accessibility enhancements
- **[config.json](config.json)** – AI endpoint configuration (Ollama URL, model name, timeout)

### Configuration Files (YAML)
- **[content/flows/soo_wizard.yml](content/flows/soo_wizard.yml)** – 12-step wizard definition with fields, hints, validation rules
- **[content/lint/rules_v2.yml](content/lint/rules_v2.yml)** – 25+ lint rules with patterns, contexts, and severity levels
- **[content/prompts/soo_prompt.yml](content/prompts/soo_prompt.yml)** – AI prompt template for SOO draft generation
- **[content/prompts/pws_request_pack_prompt.yml](content/prompts/pws_request_pack_prompt.yml)** – AI prompt for vendor instruction pack
- **[content/prompts/soo_rewrite_prompt.yml](content/prompts/soo_rewrite_prompt.yml)** – AI prompt for critical review questions

### Documentation
- **[README.md](README.md)** – User-facing overview, quick start, features, installation
- **[AGENTS.md](AGENTS.md)** – This file; guidance for AI agents and contributors
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** – Compact reference for 12-step workflow, lint rules, AI config
- **[DELIVERABLES.md](DELIVERABLES.md)** – Complete feature list and implementation details for v2.0
- **[INSTALL.md](INSTALL.md)** – Detailed setup instructions including AI configuration
- **[RFP_TO_SOO_CONVERSION_PROMPT.md](RFP_TO_SOO_CONVERSION_PROMPT.md)** – AI prompt for converting traditional RFPs to SOO format

### Examples
- **[examples/](examples/)** – Real-world SOO examples with `inputs.yml` files for testing and reference:
  - [gsa-accessibility-research/](examples/gsa-accessibility-research/)
  - [Maryland/](examples/Maryland/)
  - [uk-sustainability-guidelines/](examples/uk-sustainability-guidelines/)
  - [va-veterans-webpage/](examples/va-veterans-webpage/)

### Data Flow
1. User loads wizard → [app_v2.js](app_v2.js) fetches [soo_wizard.yml](content/flows/soo_wizard.yml)
2. User fills fields → [app_v2.js](app_v2.js) validates against [rules_v2.yml](content/lint/rules_v2.yml) at gate steps
3. User generates SOO → [app_v2.js](app_v2.js) renders [soo_prompt.yml](content/prompts/soo_prompt.yml) template with user data, calls AI endpoint from [config.json](config.json)
4. User exports → [app_v2.js](app_v2.js) generates ZIP with MD/HTML/RTF formats plus `inputs.yml` and `audit.json`

### State Management
- **localStorage** – Auto-saves all answers after every field change (key: `sooWizardAnswersV2`)
- **state.answers** – In-memory object with all user inputs, indexed by field ID
- **state.audit** – Tracks readiness scores, lint results, step completions, AI usage
- **Session restore** – Import `inputs.yml` to overwrite current state and resume work

### Offline Support
- A service worker (`sw.js`) caches static assets for offline use.
- When offline, an in-page banner indicates offline mode; progress continues to save locally.
- Sync is not implemented; all data remains on-device unless users export.

### Modification Patterns
- **Add a wizard step:** Edit [soo_wizard.yml](content/flows/soo_wizard.yml), increment step numbers, add field definitions
- **Add lint rule:** Edit [rules_v2.yml](content/lint/rules_v2.yml), specify pattern, context, severity
- **Change AI behavior:** Edit [soo_prompt.yml](content/prompts/soo_prompt.yml) template, adjust guardrails and examples
- **Add export format:** Modify `exportBundle()` function in [app_v2.js](app_v2.js), add new file generation logic

## Contribution Standards
Pull requests should include:
- Description of the change and why it was made
- Notes on any accessibility impact (positive or negative)
- Documentation of known limitations or trade-offs introduced

## Glossary

### Federal Acquisition Terms

**SOO (Statement of Objectives)**
A performance-based acquisition document that describes *what* the government wants to achieve (outcomes and constraints) without specifying *how* vendors should achieve it. Contrasts with traditional task-based Statements of Work (SOW).

**PWS (Performance Work Statement)**
A vendor-written document that responds to the SOO by proposing *how* they will achieve the stated objectives. The SOO Wizard generates a "PWS Request Pack" to guide vendors in writing their PWS.

**FAR (Federal Acquisition Regulation)**
The primary regulation governing federal procurement. FAR Part 37.6 specifically addresses performance-based acquisition, which emphasizes outcomes over tasks.

**8(a) Program**
An SBA program that supports small, disadvantaged businesses. Federal agencies can use streamlined acquisition procedures with 8(a)-certified firms for certain digital services contracts.

**Performance-Based Acquisition (PBA)**
Acquisition method that focuses on measurable outcomes, quality standards, and performance incentives rather than prescriptive task lists.

### Agile and Product Management Terms

**Product Owner (PO)**
The person with authority to prioritize features, make trade-off decisions, and represent end-user needs throughout contract execution. Essential for agile delivery models.

**End-User Access**
Direct contact with actual users of the system for research, testing, and feedback. Critical for outcome-based contracts to ensure solutions meet real needs.

**Outcome-Based Language**
Language that describes desired results and success criteria rather than specific tasks or technical implementations. Example: "Reduce application processing time by 50%" (outcome) vs. "Build a new API" (task).

**Task-Based Language**
Language that prescribes specific activities, deliverables, or technical solutions. Forbidden in SOOs because it limits vendor innovation and shifts risk to the government.

**Readiness Assessment**
A rule-based evaluation (Step 2-3) that checks if the user has both a Product Owner and end-user access. Scoring is automatic based on detecting "Yes" in the user's answers. STRONG = both present, MEDIUM = one present, LOW = neither present. Used to recommend contract type (full agile vs. discovery/pilot).

### Product Vision Framework

**Geoffrey Moore Positioning Template**
A structured one-sentence format for product positioning: "For [target customer] who [need/problem], [product name] is a [product category] that [key benefit]. Unlike [alternative], our product [differentiation]."

**Product Vision Board**
A framework with five elements: Vision (3-5 year outcome), Target Group (users), Needs (current pain points), Product (capabilities as outcomes), and Business Goals.

### Linting and Compliance

**Lint Rules**
Automated checks that detect forbidden language patterns in user inputs. The wizard uses 25+ rules to flag requirement modals ("shall", "must"), task verbs ("build", "develop"), and deliverable nouns ("wireframes", "user stories").

**Lint Gate**
A step in the wizard where users cannot proceed until all lint violations are resolved. Gates exist at SOO Inputs and Methodology steps to ensure clean inputs before AI generation.

**Context-Aware Linting**
Different rule sets for different sections: "vision" context flags solutioning, "problem" context requires current-state only, "soo" context strictly enforces outcome-based language.

### Technical Terms

**Client-Side Application**
All processing happens in the user's browser; no server-side code or database. Enables privacy (data never leaves the user's device) and simple hosting (static files on GitHub Pages).

**YAML Configuration**
Human-readable data format used for wizard flow definition (`soo_wizard.yml`), lint rules (`rules_v2.yml`), and AI prompts (`soo_prompt.yml`). Allows non-developers to modify wizard behavior.

**Audit Trail**
Complete record of all wizard activity: readiness scores, lint results, step completions, AI calls, and timestamps. Exported as `audit.json` for transparency and reproducibility.

**Session Restore**
Users can export `inputs.yml` with all their answers and AI-generated content, then re-import it later to continue work on a different device or after cache clearing.

### Export Formats

**Markdown (.md)**
Plain text format with simple formatting syntax. GitHub-friendly and human-readable. Primary format for version control and collaboration.

**HTML (.html)**
Browser-viewable format. Can be opened in any browser and copy-pasted into Word or Google Docs while preserving formatting.

**RTF (Rich Text Format)**
Microsoft Word-native format. Opens directly in Word with full formatting (headings, lists, bold/italic) intact.

### Common Abbreviations

- **SOO** – Statement of Objectives
- **PWS** – Performance Work Statement  
- **SOW** – Statement of Work (traditional, task-based alternative to SOO)
- **PO** – Product Owner
- **FAR** – Federal Acquisition Regulation
- **RFP** – Request for Proposal
- **PBA** – Performance-Based Acquisition
- **SBA** – Small Business Administration
- **USWDS** – United States Web Design System (design framework used by this wizard)
- **WCAG** – Web Content Accessibility Guidelines

## Contribution Standards
Pull requests should include:
- Description of the change and why it was made
- Notes on any accessibility impact (positive or negative)
- Documentation of known limitations or trade-offs introduced

## Definition of Done
A change is complete only when:
- The wizard functions correctly from start to finish
- Users can navigate and complete it using only a keyboard
- Errors and state changes are perceivable and understandable
- Accessibility has not regressed
- Known limitations are documented rather than hidden

This project values usability, accessibility, and transparency over speed or visual novelty.


## GitHub Pages constraints (required)

All pages must work when hosted under the repository subpath:
- `https://<user>.github.io/<repo>/`

Rules:
- Use relative URLs that respect the repo base path.
  - Prefer `./assets/...` or `assets/...` from the current page.
  - Avoid absolute root paths like `/assets/...` unless you explicitly set and use a base path.
- Navigation links must work from every page (no assumptions about being at site root).
- Do not rely on server-side routing. Every page must be reachable as a real file.
- Avoid build steps unless documented and reproducible. Prefer “works from static files”.
- If using Jekyll:
  - Treat Jekyll processing as optional unless `_config.yml` and layouts are part of the repo.
  - If you use `{{ site.baseurl }}`, use it consistently for links and assets.
- Provide a failure-safe: pages should render a readable error if required data files are missing.

Static asset rules:
- Pin external CDN dependencies (exact versions) and document why each exists.
- Prefer vendoring critical JS/CSS locally to reduce breakage.
- Don’t depend on blocked resources (mixed content, HTTP, or fragile third-party endpoints).

Caching/versioning:
- If you fetch JSON/data files, include a lightweight cache-busting strategy (e.g., query param using a version string) OR document that users must hard refresh after updates.


## Local preview (required before publish)

Test pages via a local HTTP server (not `file://`) to match GitHub Pages behavior.

Examples:
- `python3 -m http.server 8002`
- `npx serve`

Verify:
- links resolve under a subpath
- fetch requests succeed
- no console errors on load
