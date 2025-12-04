# SOO Wizard v2 – Quick Reference Card

## 📋 13-Step Flow

```
1. Settings              → Configure Ollama endpoint or run prompt-only
2. Readiness            → PO? End-user access?
3. Readiness Results    → Auto-generated guidance (STRONG/MEDIUM/LOW)
4. Vision Board         → 3-5 year vision, target group, needs, product, goals
5. Moore Template       → Structured differentiation sentence
6. Methodology          → Contract type (new dev, maintenance, ops, discovery, migration)
7. SOO Inputs           → Problem context, objectives, constraints [LINTED]
8. SOO Review Gate      → 5 required checkboxes (no tasks/reqs, outcome-focused, etc.)
9. Generate SOO         → Call Ollama or show prompt for copy/paste
10. SOO Draft Review    → Edit SOO, then accept
11. PWS Vendor Pack     → Auto-generated vendor instructions
12. Export Center       → Download ZIP (inputs + SOO + PWS + audit + prompts)
13. [Back to step 1]    → Reset or modify
```

---

## 🔒 Lint Rules (Quick Reference)

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
your-soo-bundle.zip
├── inputs.yml                    (all wizard answers + settings)
├── outputs/
│   ├── soo.md                    (generated SOO markdown)
│   └── pws_request_pack.md       (vendor instruction pack)
├── audit.json                    (event log: AI calls, lint results)
└── prompts.txt                   (all LLM prompts used)
```

---

## 🤖 Ollama Integration

### Enable AI:
```bash
ollama serve &
ollama pull llama3.1
# In wizard: endpoint = http://localhost:11434, model = llama3.1
```

### Prompt-Only Mode (No AI):
```
1. Leave endpoint blank
2. Wizard shows prompt in textarea
3. Copy prompt → paste into Ollama CLI or web UI
4. Paste response back into wizard
5. Same flow continues
```

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

## 🚀 Deployment

### Local Testing:
```bash
cd web
python -m http.server 8000
# http://localhost:8000
```

### GitHub Pages:
```bash
git add -A
git commit -m "SOO Wizard v2"
git push origin main
# Settings → Pages → /web folder
# https://username.github.io/soo-wizard/
```

### CORS Note:
- From GitHub Pages to localhost Ollama: **CORS blocked**
- Workarounds: (1) local web server, (2) prompt-only mode

---

## 🐛 Troubleshooting

### Ollama not responding
```
→ Check: ollama serve is running
→ Try: curl http://localhost:11434/api/generate
→ Fallback: Use prompt-only mode (blank endpoint)
```

### Lint errors blocking SOO generation
```
→ Find the violations in the error alert
→ Edit SOO inputs to remove task verbs / modals / deliverables
→ Reword as outcomes or constraints
→ Try again
```

### Export not downloading
```
→ Check: Browser allows pop-ups/downloads
→ Check: Disk space available
→ Try: Different browser
```

### Wizard not saving answers
```
→ Check: Browser localStorage not disabled
→ Check: Private/incognito mode (doesn't save)
→ Try: Normal browsing mode
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `DELIVERABLES.md` | Complete implementation summary |
| `ITERATION2_GUIDE.md` | Comprehensive feature reference |
| `README.md` | Quick start guide |
| This file | Quick reference card |

---

## 🎓 Key Concepts

### Objectives vs. Constraints vs. Tasks

| Type | Example | Who Decides |
|------|---------|------------|
| **Objective** | "Reduce time-to-complete from 4 weeks to 2 hours" | Government (defines WHAT to achieve) |
| **Constraint** | "Must comply with FedRAMP Moderate" | Government (defines boundaries) |
| **Task** | "Build a REST API" | Vendor (defines HOW to achieve objective) |

### SOO vs. PWS

| Document | Who Writes | Contains | Purpose |
|----------|-----------|----------|---------|
| **SOO** | Government | Objectives + Constraints | WHAT we need to achieve & WHAT limitations apply |
| **PWS** | Vendor | Tasks + Deliverables + Schedule | HOW we will achieve your objectives |

### Government defines WHAT. Vendor proposes HOW.

---

## 🔗 Resources

- **Ollama:** https://ollama.ai
- **USWDS:** https://designsystem.digital.gov
- **Federal Procurement:** https://www.fai.gov/
- **Geoffrey Moore:** "Crossing the Chasm" book
- **SOO Best Practices:** GSA / DoD guidance

---

## 📞 Support

1. Check `ITERATION2_GUIDE.md` for detailed feature docs
2. Review lint rules in `web/content/lint/rules.yml`
3. See examples in prompt files: `web/content/prompts/`
4. Test locally before GitHub Pages deployment

---

**SOO Wizard v2.0 – Iteration 2**  
**Production Ready: December 2, 2025**

---
