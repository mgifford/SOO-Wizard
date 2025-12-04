# SOO Wizard (GitHub Pages + Local AI)

This is a static USWDS web app hosted on GitHub Pages. It captures Product Vision + SOO inputs, enforces "no tasks or requirements" during SOO generation, and calls a local AI endpoint (default Ollama).

## Host on GitHub Pages
- Put this repo on GitHub.
- Settings → Pages → Source: `main` branch, `/web` folder.

## Run a local AI endpoint (Ollama)
- Install Ollama
- Run: `ollama serve`
- Pull a model: `ollama pull llama3.1`

In the app Settings step:
- Endpoint: `http://localhost:11434`
- Model: `llama3.1`

## CORS (important)
If you load the app from `https://<you>.github.io`, it will make requests to `http://localhost:11434`.

This requires the local AI server to allow cross-origin requests from your GitHub Pages origin.
If CORS blocks you, run the app from a local web server instead of GitHub Pages.

## Output
The app exports a portable zip containing:
- `inputs.yml`
- `outputs/soo.md`
- `audit.json`
- `prompt.txt`
