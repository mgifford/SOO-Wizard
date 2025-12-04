# SOO Wizard v2 – Iteration 2 Implementation Guide

## Overview

SOO Wizard v2 extends the baseline with five new screens, comprehensive lint enforcement, structured vision formatting (Moore template), readiness-driven guidance, and vendor-facing PWS request pack generation. The wizard remains 100% static (GitHub Pages compatible) and supports both local LLM (Ollama) and prompt-copy/paste modes.

---

## What Changed

### New Screens (5)

1. **Readiness Results** – Auto-generated assessment based on Product Owner and end-user access
2. **Product Vision: Moore Template** – Structured Geoffrey Moore sentence builder
3. **SOO Review Gate** – Manual compliance checklist (5 checkboxes) before generation
4. **SOO Draft Review and Edit** – Editable SOO output with regenerate option
5. **Vendor PWS Request Pack** – Auto-generated vendor instruction pack
6. **Export Center** – One-stop download for complete SOO Wizard bundle

### Enhanced Features

- **Ollama Integration**: Call local LLM endpoints; timeout and error handling built-in
- **Prompt-Only Mode**: If no AI endpoint configured, run as a prompt generator (copy/paste workflow)
- **Readiness Analyzer**: Scores Product Owner and end-user access; recommends contracting strategy
- **Moore Template**: Structured sentence builder for product vision differentiation
- **Manual Gate**: SOO Review Gate requires 5 explicit compliance checks before generation
- **Linting Overhaul**: 25+ lint rules covering:
  - 5 requirement modals (shall, must, required, need, will)
  - 10 task verbs (build, develop, implement, configure, migrate, design, code, create, deliver, write, produce)
  - 10 deliverable nouns (SOW, PWS, user stories, backlog, wireframes, prototype, architecture, reports, test plan, code, docs)
  - 4 vision anti-solutioning warnings (solution, technology names, hints)
- **PWS Request Pack Generation**: Auto-generates vendor-facing instruction pack from SOO
- **Audit Trail**: Tracks readiness scores, lint results, AI calls, accepted outputs
- **Export Bundle**: Downloads zip with inputs.yml, SOO.md, PWS request pack, audit.json, and prompts.txt

### File Changes

```
web/
  content/
    flows/
      soo_wizard.yml          [UPDATED: 11→13 steps, new readiness_results, vision_moore, soo_review_gate, soo_output, pws_vendor_pack, export_center]
    lint/
      rules.yml               [UPDATED: 4→25 rules, context-aware, forbidden phrases]
    prompts/
      soo_prompt.yml          [UPDATED: v1→v1.1, enhanced template, post-processing]
      pws_request_pack_prompt.yml  [NEW]
      soo_rewrite_prompt.yml   [NEW]
  app.js                      [UPDATED: Ollama integration, readiness analysis, Moore template, PWS pack generation, audit trail]
```

---

## Screen-by-Screen Flow

### Step 1: Settings
**Configure local AI endpoint or run prompt-only mode.**
- **Fields:**
  - Local AI endpoint URL (leave blank for prompt-copy/paste mode)
  - Model name (e.g., `llama3.1`)
  - AI timeout (seconds)
- **Output stored in:** `settings.ai_endpoint`, `settings.ai_model`, `settings.ai_timeout_seconds`

### Step 2: Readiness Assessment
**Tell us about your organization's readiness for agile development.**
- **Fields:**
  - Do you have a dedicated Product Owner with authority to prioritize?
  - Do you have access to end users for research and feedback?
  - Describe approvals and release constraints.
- **Output stored in:** `readiness.*`

### Step 3: Readiness Results ✨ NEW
**Auto-generated guidance based on readiness answers.**
- **Read-only field** shows:
  - If PO + end-users → "STRONG: You are well-positioned for agile development"
  - If PO OR end-users → "MEDIUM: Consider phased approach (pilot first)"
  - If neither → "LOW: Start with discovery/research contract first"
- **Required checkbox:** "I understand the readiness assessment and am ready to proceed."
- **Output stored in:** `readiness_results.readiness_summary`, `readiness_results.confirm_readiness`

### Step 4: Product Vision Board (unchanged)
**Capture 3–5 year vision, target group, needs, product, business goals.**
- **Output stored in:** `product_vision_board.*`

### Step 5: Product Vision – Moore Template ✨ NEW
**Use Geoffrey Moore's sentence structure to refine vision.**
- **Fields:**
  - For [target customer]
  - who [need/problem]
  - the [product name]
  - is a [product category]
  - that [key benefit]
  - Unlike [alternative]
  - our product [primary differentiation]
- **Auto-composed statement:** "For X who Y, the Z is a W that V. Unlike U, our product T."
- **Output stored in:** `product_vision_moore.*` and `product_vision_moore.moore_statement`
- **Linting:** Warns on technology names and solutioning language

### Step 6: Methodology Selector (unchanged)
**Choose contracting context: new development, maintenance, ops support, discovery, migration.**
- **Output stored in:** `methodology.context`

### Step 7: SOO Inputs – Objectives and Constraints
**Core SOO inputs; linted to block tasks/requirements/deliverables.**
- **Lint gate active:** User cannot proceed if lint errors detected
- **Linting applied to:**
  - Problem context: warns if it reads like a solution hint
  - Objectives: errors on task verbs
  - Constraints: errors on deliverable references
- **Output stored in:** `soo_inputs.problem_context`, `soo_inputs.objectives`, `soo_inputs.constraints`

### Step 8: SOO Review Gate ✨ NEW
**Manual compliance checklist; cannot be auto-passed.**
- **5 Required checkboxes:**
  1. ✓ No tasks, deliverables, or requirements language
  2. ✓ Problem statement describes current state only
  3. ✓ Objectives are outcome-based (e.g., "Reduce X from Y to Z")
  4. ✓ Constraints are boundaries (compliance, schedule, environment), not tasks
  5. ✓ Vision and objectives stay outcome-focused; no technology selection
- **User cannot proceed without checking all 5**
- **Output stored in:** `soo_review_gate.check_*`

### Step 9: Generate SOO Draft
**Call local LLM (or show prompt-copy/paste UI if no endpoint).**
- **If LLM endpoint configured:**
  - Calls `POST {endpoint}/api/generate` with SOO prompt
  - Applies timeout (default 120 seconds)
  - Lints output; warns if violations found
  - Shows AI output in editable textarea
  - Options: "Regenerate" or "Accept & Continue"
- **If no endpoint:**
  - Shows prompt in textarea
  - Button to copy prompt
  - Separate textarea for user to paste AI response
  - Lints pasted output
- **Output stored in:** `soo_output.soo_draft`
- **Audit logged:** AI call timestamp, endpoint, model, text length, lint summary

### Step 10: SOO Draft Review and Edit ✨ NEW
**Review and make final edits to generated SOO.**
- **Editable textarea** pre-filled with SOO draft from step 9
- **User can make any edits**
- **Output stored in:** `soo_output.soo_draft` (updated from edit)

### Step 11: Vendor PWS Request Pack ✨ NEW
**Auto-generated vendor instruction pack; read-only preview.**
- **Auto-generated from:** SOO draft + readiness context + methodology
- **Includes:**
  - Government-provided SOO (verbatim)
  - What vendor PWS proposal must address (Approach, WBS, Deliverables, QA, Resources)
  - Critical reminders (you decide HOW; government defined WHAT)
  - Submission checklist for vendor self-review
- **Output stored in:** `pws_vendor_pack.pws_pack_preview`

### Step 12: Export Center ✨ NEW
**Download complete SOO Wizard bundle.**
- **Checkboxes:**
  - Include audit.json (readiness scores, lint results, AI call logs)
  - Include prompts.txt (all LLM prompts used; transparency)
- **Bundle contents (ZIP):**
  - `inputs.yml` – All wizard inputs and settings
  - `outputs/soo.md` – Final SOO Markdown
  - `outputs/pws_request_pack.md` – Vendor instruction pack
  - `audit.json` – Audit trail (timestamps, events, lint results)
  - `prompts.txt` – All prompts used with AI (for transparency/reproducibility)
  - (Optional) `diff.md` – If SOO was edited, shows before/after

---

## Linting Rules (25+)

### Requirement Modals (5 errors)
```yaml
REQ_SHALL:     \b(shall|shall not)\b
REQ_MUST:      \b(must|must not)\b
REQ_REQUIRED:  \b(is required|required to|be required|are required|requirement is)\b
REQ_WILL:      \b(will be required|will need to)\b
REQ_NEED:      \b(need to|needs to|must have|need for)\b
```

### Task Verbs (10 errors)
```yaml
TASK_BUILD, TASK_DEVELOP, TASK_IMPLEMENT, TASK_CONFIGURE, TASK_MIGRATE
TASK_DESIGN, TASK_CODE, TASK_CREATE, TASK_DELIVER, TASK_WRITE, TASK_PRODUCE
```

### Deliverable Nouns (10 errors)
```yaml
DELIVERABLE_SOW, DELIVERABLE_PWS, DELIVERABLE_BACKLOG, DELIVERABLE_WIREFRAMES
DELIVERABLE_PROTOTYPE, DELIVERABLE_ARCHITECTURE, DELIVERABLE_REPORTS
DELIVERABLE_TEST_PLAN, DELIVERABLE_CODE, DELIVERABLE_DOCS
```

### Vision Anti-Solutioning (4 warnings)
```yaml
VISION_SOLUTIONING:       \b(the solution|we will use|we will implement|we will build)\b
SOLUTION_TECH_NAME:       \b(Java|Python|React|Angular|AWS|Azure|Kubernetes|Docker|...)\b
PROBLEM_HAS_SOLUTION_HINT: \b(lacks|missing|needs|no|without)\s+(system|tool|software|...)\b
OBJECTIVE_IS_TASK:        \b(build|develop|create|design|implement|...)\b
```

---

## Prompts (YAML)

### soo_prompt.yml (v1.1)
**SOO Draft Generator**
- **Input variables:** Vision, readiness, objectives, constraints, methodology context
- **Output format:** Markdown with headings (Background, Problem, Objectives, Constraints, Assumptions, Rejected Content)
- **Guardrails:** No tasks, no requirements language, no deliverables, no solutioning
- **Example rewrites:** "Build an API" → "Citizens can submit requests in under 5 minutes"

### pws_request_pack_prompt.yml (NEW)
**Vendor PWS Request Pack Generator**
- **Input:** Full SOO Markdown
- **Output:** Vendor-facing instruction pack with:
  - Government SOO section (verbatim)
  - What vendor PWS must address
  - Critical reminders
  - Submission checklist
- **Note:** Current app.js generates a basic template; could be enhanced with LLM-based generation

### soo_rewrite_prompt.yml (NEW)
**SOO Compliance Rewriter**
- **Input:** User-edited SOO draft
- **Output:** JSON with:
  - `rewritten_soo`: Compliant Markdown
  - `redlines`: List of violations, actions taken, reasoning
- **Example:** "Build a mobile app" → Rewritten to objective + listed in redlines as `TASK_VERB`
- **Note:** Not yet integrated into v2; reserved for future "regenerate with fixes" feature

---

## Ollama Integration

### How It Works

1. **Configuration (Settings Step):**
   - User enters Ollama endpoint (default: `http://localhost:11434`)
   - Model name (e.g., `llama3.1`)
   - Timeout in seconds

2. **Prompt Generation:**
   - Wizard renders SOO prompt with all user inputs as variables
   - Includes Product Vision Board, readiness context, objectives, constraints

3. **API Call:**
   ```javascript
   POST {endpoint}/api/generate
   {
     "model": "llama3.1",
     "prompt": "...",
     "stream": false
   }
   ```

4. **Response Handling:**
   - Timeout: if no response in N seconds, shows error
   - Lint: output is scanned for task/requirement/deliverable language
   - Display: editable textarea with "Regenerate" or "Accept" options

5. **Prompt-Only Mode:**
   - If endpoint is blank, wizard shows prompt in textarea
   - User can copy/paste it into Ollama CLI or web UI
   - User pastes response back into wizard
   - Same lint and acceptance flow

### Error Handling

- **Connection refused:** Shows Ollama startup instructions
- **Model not found:** Suggests pulling model first (`ollama pull llama3.1`)
- **CORS blocked:** Explains localhost vs GitHub Pages limitation; suggests local web server
- **Timeout:** Advises increasing timeout in settings

### Running Ollama Locally

```bash
# Install Ollama from https://ollama.ai

# Start Ollama server
ollama serve

# In another terminal, pull a model
ollama pull llama3.1
ollama pull mistral

# Test via curl
curl http://localhost:11434/api/generate \
  -d '{
    "model": "llama3.1",
    "prompt": "Hello, world!",
    "stream": false
  }'
```

---

## Storage & Export

### Browser Storage
- **localStorage key:** `sooWizardState`
- **Content:** JSON serialization of all `state.answers` (every field value)
- **Persistence:** Survives browser refresh; lost if cache cleared

### inputs.yml (Export)
```yaml
version: 1
metadata:
  createdAt: 2025-12-02T...
  wizardVersion: "2.0"
readiness:
  has_po: "Yes, our agency..."
  end_user_access: "Yes, we..."
  approvals_cycle: "CIO approval required, typically 2 weeks"
product_vision_board:
  vision: "..."
  target_group: "..."
  needs: "..."
  product: "..."
  business_goals: "..."
product_vision_moore:
  target_customer: "..."
  customer_need: "..."
  product_name: "..."
  product_category: "..."
  key_benefit: "..."
  alternative: "..."
  differentiation: "..."
  moore_statement: "For X who Y, the Z is a W that V. Unlike U, our product T."
methodology:
  context: "new_dev"
soo_inputs:
  problem_context: "..."
  objectives: "..."
  constraints: "..."
settings:
  ai_endpoint: "http://localhost:11434"
  ai_model: "llama3.1"
  ai_timeout_seconds: "120"
```

### soo.md (Export)
```markdown
# Statement of Objectives (SOO)
## Background
...
## Problem Statement
...
## Objectives
- ...
## Constraints
- ...
## Assumptions
...
## Rejected Content
...
```

### pws_request_pack.md (Export)
```markdown
# Vendor Instruction Pack: Responding to the SOO

## Introduction
...

## Government-Provided SOO
[Full SOO verbatim]

## Your PWS Proposal: What We Expect

### Proposed Approach and Methodology
...
```

### audit.json (Export)
```json
{
  "events": [
    {
      "timestamp": "2025-12-02T...",
      "event": "ai_call_success",
      "endpoint": "http://localhost:11434",
      "model": "llama3.1",
      "textLength": 2547
    },
    {
      "timestamp": "2025-12-02T...",
      "event": "soo_draft_accepted",
      "lintSummary": {
        "hasErrors": false,
        "errorCount": 0,
        "warnCount": 2
      }
    }
  ]
}
```

### prompts.txt (Export)
```
SOO GENERATION PROMPT
====================
[Full SOO generation prompt with user inputs]

PWS REQUEST PACK PROMPT
======================
[Full PWS pack generation prompt]

...
```

---

## Field Type Reference

- **text** – Single-line input
- **textarea** – Multi-line text area
- **select** – Dropdown with options
- **checkbox** – Boolean toggle
- **repeatable_list** – (Future) Array of values (not yet implemented)

### Textarea Properties
- `rows: N` – Number of visible rows
- `readonly: true` – Auto-generated, user cannot edit
- `hint: "..."` – Help text below label

### Checkbox Properties
- `required: true` – Must be checked to proceed (soo_review_gate)
- `default: true` – Pre-checked

---

## Key Design Decisions

1. **No Backend Required**: All processing happens in the browser. Wizard works offline after initial page load.

2. **Prompt-Copy/Paste Mode**: If Ollama is unavailable, wizard degrades gracefully. Users can run prompts through any LLM (local, CLI, web interface) and paste outputs back.

3. **Manual Review Gate**: The `soo_review_gate` step requires explicit checkboxes. This prevents accidental generation of non-compliant SOOs; it's a human checkpoint, not auto-skippable.

4. **Linting is Advisory**: Warnings (e.g., vision solutioning) do not block; only errors (task verbs, requirements modals, deliverables) do. This allows flexibility while enforcing hard constraints.

5. **Audit Trail**: Every significant action (AI call, draft acceptance, lint results) is logged. This supports reproducibility and debugging.

6. **Moore Template**: Structured vision helps teams articulate differentiation and scope clearly before diving into requirements.

7. **Readiness Assessment**: No hard contract recommendation (that's for humans), but the assessment flags high-risk conditions early (no PO, no user access).

---

## Testing Checklist

- [ ] Flow loads all 13 steps
- [ ] Readiness results auto-populate based on PO/end-user answers
- [ ] Moore template renders correctly (7 fields compose into 1 statement)
- [ ] SOO review gate requires all 5 checkboxes before next button works
- [ ] Lint rules block task verbs, requirement modals, deliverable nouns
- [ ] Ollama integration: calls endpoint and displays response
- [ ] Prompt-only mode: shows prompt textarea if endpoint is blank
- [ ] Export: zip contains inputs.yml, soo.md, pws_request_pack.md, audit.json, prompts.txt
- [ ] Browser storage persists answers across refresh
- [ ] Reset wizard clears all answers

---

## Deployment (GitHub Pages)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "SOO Wizard v2 – Iteration 2"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Settings → Pages → Source: `main` branch, `/web` folder

3. **Access:**
   - `https://your-username.github.io/soo-wizard/`

4. **CORS Note:**
   - If accessing from GitHub Pages and Ollama is localhost, CORS will block requests
   - Workaround: Run wizard from local web server (e.g., `python -m http.server`) or use prompt-only mode

---

## Future Enhancements (v2.1+)

1. **Regenerate with Fixes**: Use `soo_rewrite_prompt.yml` to automatically rewrite SOO to fix lint violations
2. **Diff Mode**: Show before/after if SOO was edited by user
3. **Template Library**: Pre-built SOO templates for common contract types (new dev, maintenance, migration)
4. **Vendor Response Tracking**: Import vendor PWS responses; lint them for compliance
5. **Multi-language Support**: Localize UI and prompts (es, fr, etc.)
6. **Dark Mode**: UI preference
7. **Accessibility Audit**: WCAG 2.1 AA full compliance

---

## Support & Resources

- **Ollama**: https://ollama.ai
- **USWDS**: https://designsystem.digital.gov
- **Statement of Objectives**: https://www.fai.gov/
- **Geoffrey Moore**: "Crossing the Chasm" (positioning framework)

---

## License

[Your license here]

---

**Last Updated:** December 2, 2025  
**Version:** 2.0  
**Status:** ✓ Iteration 2 Complete
