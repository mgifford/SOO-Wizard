# SOO Wizard v2 – Quick Reference Card

**For complete setup instructions:** See [INSTALL.md](INSTALL.md)  
**For feature overview:** See [README.md](README.md)

## 📋 12-Step Workflow

```
1. Introduction            → How to use the wizard
2. Readiness Assessment    → PO? End-user access? Approvals cycle?
3. Readiness Results       → Auto-generated guidance (STRONG/MEDIUM/LOW)
4. Product Vision Board    → 3-5 year vision, target group, needs, product, goals
5. Product Positioning     → Geoffrey Moore positioning sentence
6. SOO Inputs              → Problem context, objectives, constraints [LINTED]
7. Methodology             → Contract context, budget, background (auto-fill/refresh), outcomes/evidence/governance [LINTED]
8. SOO Review Gate         → 5 required checkboxes (no tasks/reqs, outcome-focused, etc.)
9. Generate SOO            → AI generation with editable prompt OR manual workflow
10. Critical Review        → AI-generated questions as checkboxes + edit draft
11. PWS Vendor Pack        → Auto-generated vendor instructions (editable)
12. Export Center          → Download ZIP bundle with all outputs + source files
```

**Navigation:** Use step circles at top to jump between steps. All progress auto-saves.

---

## 🔒 Lint Rules (Quick Reference)

**Gates:** SOO Inputs and Methodology steps enforce lint checks before generation.

### ❌ ERRORS (Strict Blocks)

**Requirement Modals (5):**
- shall, must, required to, need to, will be required

**Task Verbs (10):**
- build, develop, implement, configure, migrate, design, code, create, deliver, write, produce

**Deliverable Nouns (10):**
- SOW, PWS, user stories, backlog, wireframes, prototype, architecture diagram, reports, test plan, code, docs

### ⚠️ WARNINGS (Advisory)

**Vision Anti-Solutioning:**
- "the solution", "we will use", technology names (Java, React, AWS, etc.)
- "lacks system", "missing tool" → focus on outcome instead
- Task verbs in objectives → should be outcome-focused

---

## 💾 Export Bundle Contents

```
ProductName-2025-12-04T15-30-00.zip
├── soo.md / .html / .rtf         (Main deliverable: SOO in 3 formats)
├── pws_request_pack.md / .html / .rtf  (Vendor instructions in 3 formats)
└── source/
    ├── inputs.yml                (All answers + review checklist)
    ├── audit.json                (Readiness scores, lint results, step tracking)
    └── prompts.txt               (Fully rendered prompts with your data)
```

**Formats:**
- **Markdown (.md)** - Plain text, GitHub-friendly
- **HTML (.html)** - Open in browser, copy to Word
- **RTF (.rtf)** - Native Word format, fully compatible

### 🔄 Restore Previous Session

1. Open Export accordion (bottom of wizard)
2. Click "Import session" file input
3. Select previously exported `inputs.yml`
4. Wizard restores all answers + AI-generated content
5. Continue where you left off

**Use cases:**
- Work across multiple devices
- Share SOO projects with colleagues
- Backup work externally
- Resume after browser cache clear

---

## 🤖 AI Integration

### Option 1: Ollama (Local AI)
```bash
ollama serve
ollama pull llama3.1
```
Edit `web/config.json`:
```json
{
  "aiEndpoint": "http://localhost:11434",
  "model": "llama3.1",
  "timeout": 120
}
```

### Option 2: Google Gemini (Cloud AI)
See [INSTALL.md](INSTALL.md) for proxy server setup.

### Option 3: Manual Mode (No setup)
1. Wizard always shows editable prompts
2. Click "Copy Prompt" 
3. Paste into any AI tool (ChatGPT, Claude, etc.)
4. Paste response back into wizard
5. Continue workflow

---

## 📊 Readiness Assessment

| PO? | End-Users? | Grade | Recommendation |
|-----|------------|-------|-----------------|
| ✅ Yes | ✅ Yes | STRONG | ✓ Agile development contract |
| ✅ Yes | ❌ No | MEDIUM | → Discovery/pilot first |
| ❌ No | ✅ Yes | MEDIUM | → Discovery/pilot first |
| ❌ No | ❌ No | LOW | → Research/training contract first |

---

## 📝 Moore Template

**Formula:**
```
For [TARGET] who [NEED], the [PRODUCT] is a [CATEGORY] 
that [BENEFIT]. Unlike [ALTERNATIVE], our product [DIFFERENTIATION].
```

**Example:**
```
For federal agencies who need rapid digital service delivery,
the Citizen Services Platform is a cloud-native government platform
that enables services delivery in weeks, not months.
Unlike waterfall or traditional outsourcing, our product
combines agile practices with FedRAMP compliance.
```

---

## ✅ SOO Review Gate (5 Checkboxes)

Must check all before generating SOO:

- [ ] No tasks, deliverables, or requirements language
- [ ] Problem statement = current state only (no solutions)
- [ ] Objectives = outcome-based (e.g., "Reduce X from Y to Z")
- [ ] Constraints = boundaries (compliance, schedule, environment)
- [ ] Vision & objectives = outcome-focused (no tech selection)

---

## 🎯 SOO Best Practices

### ✅ DO

```yaml
Problem Context:
  "Citizens wait 4-6 weeks in-person to renew licenses 
   because no online option exists."

Objective:
  - "Citizens can renew licenses online in under 2 hours."
  - "95% of renewals process automatically within 24 hours."

Constraint:
  - "Must comply with FedRAMP Moderate"
  - "Support desktop and mobile browsers"
  - "Production deployment by Q4 2025"
```

### ❌ DON'T

```yaml
Problem Context:
  "We need to build a modern mobile app" 
  [Solution hint - rewrite to gap/outcome]

Objective:
  - "Implement a REST API for citizen services"
  [Task verb - rewrite to outcome]
  - "System shall process 1000 transactions per day"
  [Requirement modal + deliverable - rewrite as constraint]

Constraint:
  - "Deliver wireframes and test plans by Q1"
  [Vendor deliverable - remove from SOO]
```

---

## 📱 Field Types Reference

| Type | Example | Validation |
|------|---------|-----------|
| text | "llama3.1" | Single line |
| textarea | Multi-line input | Multiple lines; `rows=N` |
| select | Dropdown menu | Options defined in YAML |
| checkbox | Boolean toggle | `required: true` for gates |
| readonly | Auto-generated | Read-only display |
| repeatable_list | (Future) Multiple entries | Not yet implemented |

---

## 🚀 Quick Start

### Local Testing:
```bash
cd web
python3 -m http.server 8000
# Visit http://localhost:8000
```

### GitHub Pages Deployment:
```bash
git add .
git commit -m "SOO Wizard v2"
git push origin main
# Settings → Pages → /web folder
# https://username.github.io/soo-wizard/
```

**See [INSTALL.md](INSTALL.md) for complete deployment instructions including AI setup.**

---

## 🐛 Common Issues

**Ollama not responding:**
```bash
# Check if running
curl http://localhost:11434/api/generate

# Enable CORS for GitHub Pages
export OLLAMA_ORIGINS="https://yourusername.github.io"
ollama serve
```

**YAML not loading:**
- Hard refresh browser (Cmd+Shift+R / Ctrl+F5)
- Check browser console for errors

**RTF files won't open:**
- Try LibreOffice first, then save as .docx
- Or use HTML version and open in Word

**For full troubleshooting:** See [INSTALL.md](INSTALL.md#troubleshooting)

---

## 📖 Documentation Structure

| Document | Purpose | Read Time |
|----------|---------|-----------|
| `README.md` | Feature overview, quick start | 5 min |
| `INSTALL.md` | Complete setup guide (AI, deployment, troubleshooting) | 15 min |
| `QUICK_REFERENCE.md` (this file) | Cheat sheet for workflow & concepts | 3 min |
| `DELIVERABLES.md` | Implementation checklist & technical details | 10 min |

---

## 🎓 Key Concepts

### Objectives vs. Constraints vs. Tasks

| Type | Example | Who Decides |
|------|---------|------------|
| **Objective** | "Reduce time-to-complete from 4 weeks to 2 hours" | Government (WHAT to achieve) |
| **Constraint** | "Must comply with FedRAMP Moderate" | Government (boundaries) |
| **Task** | "Build a REST API" | Vendor (HOW to achieve) |

**Rule:** Government defines WHAT. Vendor proposes HOW.

### SOO vs. PWS

| Document | Who Writes | Contains |
|----------|-----------|----------|
| **SOO** | Government | Objectives + Constraints |
| **PWS** | Vendor | Tasks + Deliverables + Schedule |

---

## 🔗 Resources

- **Ollama:** https://ollama.ai
- **USWDS:** https://designsystem.digital.gov
- **FAR 37.6 (Performance-Based Acquisition):** https://www.acquisition.gov/far/subpart-37.6
- **Geoffrey Moore's Product Vision:** "Crossing the Chasm" book
- **Digital Services Playbook:** https://playbook.cio.gov
2. Review lint rules in `web/content/lint/rules.yml`
3. See examples in prompt files: `web/content/prompts/`
4. Test locally before GitHub Pages deployment

---

**SOO Wizard v2.0 – Iteration 2**  
**Production Ready: December 2, 2025**

---
