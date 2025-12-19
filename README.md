# SOO Wizard v2.0

A guided wizard for creating compliant, outcome-focused Statements of Objectives (SOO) for federal procurement. Built with USWDS and designed to run entirely in the browser with optional AI assistance.

## ✨ Features

- **📝 Step-by-step guidance** through Product Vision, Readiness Assessment, Moore's Product Vision Statement, and SOO development
- **🤖 AI-powered generation** with Ollama (local) or Google Gemini (cloud) integration
- **✅ Built-in compliance checking** with lint rules to prevent task-based language
- **🛡️ Lint gates where it matters** on SOO Inputs and Methodology to block tasky/requirement language before generation
- **🔍 Critical review phase** with AI-generated questions to improve draft quality
- **📦 Multiple export formats**: Markdown, HTML, and RTF (Word-compatible)
- **📊 Complete audit trail** tracking readiness scores, lint results, and workflow progress
- **💾 Auto-save & offline support** with localStorage persistence
- **🔄 Session import/restore** from previously exported inputs.yml files
- **🔒 Privacy-first**: All data stays in your browser (unless using cloud AI)

## 🚀 Quick Start

**Option 1: Use it online**
Visit the live demo at `https://yourusername.github.io/soo-wizard/`

**Option 2: Run locally**
```bash
cd web
python3 -m http.server 8000
# Visit http://localhost:8000
```

**Option 3: Host on GitHub Pages**
1. Fork this repo
2. Go to Settings → Pages → Source: `main` branch, `/web` folder
3. Access at `https://yourusername.github.io/soo-wizard/`

See [INSTALL.md](INSTALL.md) for detailed setup instructions including AI configuration.

## 📦 What You Get

When you export your SOO, you receive a timestamped ZIP file containing:

**Main deliverables (top level):**
- `soo.md` / `soo.html` / `soo.rtf` - Statement of Objectives in multiple formats
- `pws_request_pack.md` / `pws_request_pack.html` / `pws_request_pack.rtf` - Vendor instruction pack

**Source materials (`source/` folder):**
- `inputs.yml` - All your answers, settings, and AI-generated content (can be re-imported to restore sessions)
- `audit.json` - Readiness assessment, lint results, step completions, AI usage
- `prompts.txt` - Fully rendered AI prompts with your data (for reproducibility)

**Methodology data carried into prompts and outputs:**
- Background (auto-fills from Regulations + Tech stack; refresh link on Methodology step)
- Outcome(s) definition, evidence signals/data sources, and governance (review cadence, triggers, incentives)

## 🎯 Why Use This Wizard?

Federal procurement requires SOOs that focus on **outcomes** (what success looks like) rather than **tasks** (how to build it). This wizard:

- Guides you through best practices for outcome-based procurement
- Prevents common mistakes (tasks, requirements, implementation details in SOO)
- Assesses your readiness for agile contracts (Product Owner, end-user access)
- Generates vendor instruction packs explaining how to respond to your SOO
- Provides transparency with complete audit trails and reproducible prompts

## 🤝 Contributing

## 🔄 Converting Existing RFPs to SOO Examples

Have an existing RFP you want to convert to an outcome-focused SOO? Use our conversion prompt:

**See [RFP_TO_SOO_CONVERSION_PROMPT.md](RFP_TO_SOO_CONVERSION_PROMPT.md)** for a complete AI prompt that analyzes traditional RFPs and generates:
- Complete `inputs.yml` file for SOO Wizard import
- `README.md` documentation explaining the transformation
- Key insights on moving from task-based to outcome-focused procurement

This lets you quickly create new examples by analyzing real-world RFPs and demonstrating how they could be improved with the SOO approach.

Contributions welcome! Key areas:
- Additional lint rules for SOO compliance
- New AI provider integrations
- Export format improvements
- Accessibility enhancements
- New example scenarios (use the RFP conversion prompt!)

## 📄 License

Public domain / CC0

## 🔗 Related Resources

- [USWDS Design System](https://designsystem.digital.gov/)
- [FAR Part 37.6 - Performance-Based Acquisition](https://www.acquisition.gov/far/subpart-37.6)
- [Digital Services Playbook](https://playbook.cio.gov/)

## AI Disclosure

Yes. AI was used in creating this tool. There be dragons! 


