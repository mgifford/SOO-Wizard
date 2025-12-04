# Installation & Configuration Guide

This guide covers setup options for the SOO Wizard, including AI configuration with Ollama (local) and Google Gemini (cloud).

## Table of Contents
- [Basic Setup](#basic-setup)
- [AI Configuration](#ai-configuration)
  - [Option 1: No AI (Manual Mode)](#option-1-no-ai-manual-mode)
  - [Option 2: Ollama (Local AI)](#option-2-ollama-local-ai)
  - [Option 3: Google Gemini (Cloud AI)](#option-3-google-gemini-cloud-ai)
- [GitHub Pages Deployment](#github-pages-deployment)
- [Troubleshooting](#troubleshooting)

---

## Basic Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for initial load and USWDS assets)
- **Optional**: Local web server for development

### Run Locally

**Option A: Simple HTTP Server (Python)**
```bash
cd web
python3 -m http.server 8000
# Visit http://localhost:8000
```

**Option B: Node.js HTTP Server**
```bash
npm install -g http-server
cd web
http-server -p 8000
# Visit http://localhost:8000
```

**Option C: VS Code Live Server**
1. Install "Live Server" extension
2. Right-click `web/index.html`
3. Select "Open with Live Server"

---

## AI Configuration

The wizard works in three modes:

1. **Manual mode**: Copy/paste prompts to external AI tools
2. **Local AI**: Ollama running on your machine
3. **Cloud AI**: Google Gemini API

### Option 1: No AI (Manual Mode)

**No configuration needed!** The wizard always shows prompts you can copy and paste into:
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Any other LLM

This is the **most private option** - all data stays on your machine.

---

### Option 2: Ollama (Local AI)

Run powerful open-source models on your own hardware.

#### Step 1: Install Ollama

**macOS:**
```bash
brew install ollama
```

Or download from [ollama.ai](https://ollama.ai)

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download installer from [ollama.ai](https://ollama.ai)

#### Step 2: Start Ollama Server

```bash
ollama serve
```

This starts the API server at `http://localhost:11434`

#### Step 3: Pull a Model

**Recommended models:**

```bash
# Fast, good quality (4GB RAM)
ollama pull llama3.2

# Better quality (8GB RAM)
ollama pull llama3.1

# Best quality, slower (16GB RAM)
ollama pull llama3.1:70b

# Code-focused
ollama pull codellama
```

#### Step 4: Configure the Wizard

Edit `web/config.json`:

```json
{
  "aiEndpoint": "http://localhost:11434",
  "model": "llama3.1",
  "timeout": 120
}
```

#### Step 5: Enable CORS (if using GitHub Pages)

If loading the wizard from `https://yourusername.github.io`, you need to allow CORS.

**macOS/Linux:**
```bash
# Stop ollama
pkill ollama

# Start with CORS enabled
OLLAMA_ORIGINS="https://yourusername.github.io" ollama serve
```

**Set permanently** (add to `~/.zshrc` or `~/.bashrc`):
```bash
export OLLAMA_ORIGINS="https://yourusername.github.io"
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="https://yourusername.github.io"
ollama serve
```

---

### Option 3: Google Gemini (Cloud AI)

Use Google's Gemini models via API. Requires internet connection and API key.

#### Step 1: Get API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your key (starts with `AIza...`)

#### Step 2: Create a Proxy Server

**Why?** You cannot call Gemini directly from browser JavaScript (API key would be exposed). You need a simple proxy.

**Create `gemini-proxy.js`:**

```javascript
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    res.json({ response: response.text() });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gemini proxy running on http://localhost:${PORT}`);
});
```

#### Step 3: Install Dependencies

```bash
npm init -y
npm install express cors @google/generative-ai
```

#### Step 4: Run the Proxy

```bash
export GEMINI_API_KEY="your-api-key-here"
node gemini-proxy.js
```

#### Step 5: Configure the Wizard

Edit `web/config.json`:

```json
{
  "aiEndpoint": "http://localhost:3000",
  "model": "gemini-1.5-flash",
  "timeout": 120
}
```

**Available Gemini models:**
- `gemini-1.5-flash` - Fast, cost-effective
- `gemini-1.5-pro` - Higher quality, slower
- `gemini-2.0-flash-exp` - Latest experimental model

---

## GitHub Pages Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to repository Settings
2. Navigate to "Pages" section
3. Source: Deploy from branch
4. Branch: `main`
5. Folder: `/web`
6. Click "Save"

### Step 3: Access Your Site

After 1-2 minutes, your wizard will be live at:
```
https://yourusername.github.io/soo-wizard/
```

### Step 4: Configure AI (if needed)

**For Ollama:**
- Set `OLLAMA_ORIGINS` to match your GitHub Pages URL
- Update `config.json` with `http://localhost:11434`

**For Gemini:**
- Deploy proxy to a hosting service (Heroku, Railway, Fly.io)
- Update `config.json` with proxy URL

---

## Troubleshooting

### Issue: "Failed to load YAML"

**Cause:** Browser cache or file path issues

**Solution:**
```bash
# Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
# Or update cache-busting version in app_v2.js
```

### Issue: CORS error with Ollama

**Symptom:**
```
Access to fetch at 'http://localhost:11434' from origin 'https://...' has been blocked by CORS policy
```

**Solution:**
Set `OLLAMA_ORIGINS` environment variable:
```bash
export OLLAMA_ORIGINS="https://yourusername.github.io"
ollama serve
```

### Issue: Ollama generation timeout

**Cause:** Model is too large or slow for your hardware

**Solutions:**
1. Use a smaller model: `ollama pull llama3.2`
2. Increase timeout in `config.json`: `"timeout": 300`
3. Close other applications to free RAM

### Issue: AI generation button does nothing

**Causes:**
1. AI endpoint not configured
2. AI service not running
3. Network/CORS issue

**Check:**
```bash
# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Hello",
  "stream": false
}'

# Test Gemini proxy
curl http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{
  "model": "gemini-1.5-flash",
  "prompt": "Hello"
}'
```

### Issue: localStorage quota exceeded

**Cause:** Very large SOO drafts stored in browser

**Solution:**
```javascript
// Open browser console and run:
localStorage.clear()
// Then reload the page
```

### Issue: Exported RTF won't open in Word

**Cause:** Special characters or encoding issues

**Solutions:**
1. Try opening in LibreOffice first, then save as .docx
2. Use the HTML export and open in Word (Insert → Object → Text from File)
3. Copy/paste from Markdown export

---

## Performance Tips

**For faster AI generation:**
1. Use smaller models (llama3.2 vs llama3.1:70b)
2. Increase RAM available to Ollama
3. Use Gemini if you have good internet but limited hardware

**For better quality:**
1. Use larger models (llama3.1:70b, gemini-1.5-pro)
2. Edit prompts in Step 8 to add more context
3. Use the critical review phase (Step 9) to iterate

**For maximum privacy:**
1. Use Ollama (local) instead of Gemini (cloud)
2. Or use manual mode with local LLMs like LM Studio
3. All exports stay on your machine

---

## Advanced Configuration

### Custom Prompts

Edit YAML files in `web/content/prompts/`:
- `soo_prompt.yml` - Main SOO generation
- `pws_request_pack_prompt.yml` - Vendor instructions
- `soo_rewrite_prompt.yml` - SOO improvement suggestions

### Custom Lint Rules

Edit `web/content/lint/rules_v2.yml`:

```yaml
lint:
  disallow:
    - id: custom_rule
      pattern: "your regex pattern"
      message: "Your error message"
  warn:
    - id: custom_warning
      pattern: "another pattern"
      message: "Your warning message"
```

### Custom Workflow Steps

Edit `web/content/flows/soo_wizard.yml` to modify the step sequence.

---

## Need Help?

- **Documentation issues**: Open an issue on GitHub
- **AI setup problems**: Check Ollama docs or Gemini AI Studio help
- **USWDS questions**: See [designsystem.digital.gov](https://designsystem.digital.gov)

---

**Next Steps:**
- Return to [README.md](README.md) for feature overview
- See [DELIVERABLES.md](DELIVERABLES.md) for detailed export information
