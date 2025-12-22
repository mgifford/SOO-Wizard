# AGENTS.md

## Project Purpose
SOO Wizard is a small, public-facing web application designed to guide users through a structured, step-by-step decision or configuration process (“wizard” pattern).

The project prioritizes clarity, correctness, and accessibility. It is intended to support users in understanding options and consequences, not to make binding decisions on their behalf.

## Audience and Responsibility
This project is intended for general users and practitioners who need guided input and structured output.

Outputs are informational and assistive. Final responsibility for decisions, interpretation, and application of results rests with the user.

The tool must not present itself as authoritative, regulatory, or compliance-certified unless explicitly stated and justified.

## Scope
The project consists of:
- Static HTML, CSS, and JavaScript
- A client-side wizard-style UI with progressive disclosure
- Logic for validation, branching, and result presentation

No server-side processing is assumed unless explicitly documented.

## UI Contract (Wizard Pattern)
The wizard UI must be honest, predictable, and accessible.

Rules:
- Steps must be clearly identified and numbered.
- Users must be able to review and change previous answers.
- Progress indicators must reflect actual state, not assumptions.
- The UI must not skip steps silently or auto-advance without user intent.

No UI element may imply certainty or correctness beyond what the inputs justify.

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
- `python3 -m http.server 8000`
- `npx serve`

Verify:
- links resolve under a subpath
- fetch requests succeed
- no console errors on load
