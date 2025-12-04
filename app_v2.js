// SOO Wizard v2.0 - Updated 2025-12-02T23:15:00Z
// Force cache invalidation with timestamp
// Cache-busting with static version to force fresh YAML loads
const CACHE_BUST = "?v=20251202-235900";
const FLOW_URL = "./content/flows/soo_wizard.yml" + CACHE_BUST;
const LINT_RULES_URL = "./content/lint/rules_v2.yml" + CACHE_BUST;
const PROMPT_SOO_URL = "./content/prompts/soo_prompt.yml" + CACHE_BUST;
const PROMPT_PWS_URL = "./content/prompts/pws_request_pack_prompt.yml" + CACHE_BUST;
const PROMPT_REWRITE_URL = "./content/prompts/soo_rewrite_prompt.yml" + CACHE_BUST;

const state = {
  flow: null,
  rules: null,
  prompts: {},
  stepIndex: 0,
  answers: loadState() || {},
  audit: { events: [] }
};

function loadState() {
  try { return JSON.parse(localStorage.getItem("sooWizardState") || "null"); } catch { return null; }
}
function saveState() {
  localStorage.setItem("sooWizardState", JSON.stringify(state.answers));
}

// Local-first storage and offline mode
const LOCAL_KEY = 'sooWizardAnswersV2';
function saveLocalAnswers() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.answers));
  } catch (e) { console.warn('Local save failed', e); }
}
function loadLocalAnswers() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) state.answers = JSON.parse(raw);
  } catch (e) { console.warn('Local load failed', e); }
}
function syncRemoteAnswers() {
  if (!navigator.onLine) return;
  // TODO: Replace with real remote sync (e.g., POST to API)
  console.log('[SYNC] Would sync answers to remote endpoint:', state.answers);
}
window.addEventListener('online', syncRemoteAnswers);
window.addEventListener('offline', () => {
  showOfflineIndicator(true);
});
function showOfflineIndicator(isOffline) {
  let bar = document.getElementById('offline-indicator');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'offline-indicator';
    bar.style = 'position:fixed;top:0;left:0;width:100%;background:#f8d7da;color:#721c24;text-align:center;z-index:9999;padding:4px;font-weight:bold;';
    document.body.appendChild(bar);
  }
  bar.textContent = isOffline ? 'Offline mode: All progress is saved locally and will sync when online.' : '';
  bar.style.display = isOffline ? 'block' : 'none';
}
// Service worker registration for offline assets
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(
      reg => { console.log('Service worker registered', reg); },
      err => { console.warn('Service worker failed', err); }
    );
  });
}

async function fetchText(url) {
  console.log('[FETCH] Loading:', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  const text = await r.text();
  console.log('[FETCH] Received', text.length, 'bytes');
  return text;
}
async function fetchYml(url) {
  const txt = await fetchText(url);
  console.log('[YAML] Parsing from URL:', url);
  console.log('[YAML] First 200 chars:', txt.substring(0, 200));
  return window.jsyaml.load(txt);
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  // If there are multiple root elements, wrap them in a fragment
  if (t.content.children.length > 1) {
    const wrapper = document.createElement("div");
    wrapper.append(...t.content.children);
    return wrapper;
  }
  return t.content.firstElementChild;
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getAnswer(stepId, fieldId, fallback = "") {
  const key = `${stepId}.${fieldId}`;
  return state.answers[key] ?? fallback;
}
function setAnswer(stepId, fieldId, value) {
  const key = `${stepId}.${fieldId}`;
  state.answers[key] = value;
  saveLocalAnswers();
  if (navigator.onLine) syncRemoteAnswers();
}

// Readiness assessment analyzer
function analyzeReadiness() {
  const has_po = getAnswer("readiness", "has_po", "").toLowerCase();
  const end_user = getAnswer("readiness", "end_user_access", "").toLowerCase();
  
  const hasPo = has_po.includes("yes");
  const hasUsers = end_user.includes("yes");
  
  let summary = "";
  if (hasPo && hasUsers) {
    summary = "✓ Readiness STRONG. You have both a dedicated Product Owner and end-user access. You are well-positioned for an agile development contract with iterative delivery.";
  } else if (hasPo || hasUsers) {
    summary = "⚠ Readiness MEDIUM. You have either a Product Owner or end-user access, but not both. Consider a phased approach: start with a discovery or pilot contract to validate product direction before a full agile engagement.";
  } else {
    summary = "✗ Readiness LOW. You lack both a dedicated Product Owner and end-user access. We strongly recommend a discovery/research contract or a small training/pilot contract BEFORE pursuing full development. This will de-risk later procurement.";
  }
  
  return summary;
}

// Moore template builder
function buildMooreStatement() {
  const target = getAnswer("vision_moore", "target_customer", "");
  const need = getAnswer("vision_moore", "customer_need", "");
  const product = getAnswer("vision_moore", "product_name", "");
  const category = getAnswer("vision_moore", "product_category", "");
  const benefit = getAnswer("vision_moore", "key_benefit", "");
  const alt = getAnswer("vision_moore", "alternative", "");
  const diff = getAnswer("vision_moore", "differentiation", "");
  
  return `For ${target} who ${need}, the ${product} is a ${category} that ${benefit}. Unlike ${alt}, our product ${diff}.`;
}

// Add status indicator for SOO generation
let sooGenStatus = '';
function setSooGenStatus(msg, type = 'info') {
  sooGenStatus = `<div class="usa-alert usa-alert--${type}"><div class="usa-alert__body"><p>${escapeHtml(msg)}</p></div></div>`;
  const statusDiv = document.getElementById('soo-gen-status');
  if (statusDiv) statusDiv.innerHTML = sooGenStatus;
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = "";
  const step = state.flow.steps[state.stepIndex];

  // Breadcrumb navigation - visual step indicator
  function renderBreadcrumb() {
    if (!state.flow || !state.flow.steps) return "";
    const steps = state.flow.steps;
    const circles = steps.map((s, i) => {
      const isActive = i === state.stepIndex;
      const isPast = i < state.stepIndex;
      const circleColor = isActive ? '#005ea2' : isPast ? '#71767a' : '#dfe1e2';
      const textColor = isActive || isPast ? '#ffffff' : '#71767a';
      const borderColor = isActive ? '#005ea2' : '#dfe1e2';
      const titleText = escapeHtml(s.title || s.id);
      return `<span style="position:relative;display:inline-block;">
        <button 
          class="step-circle" 
          data-step="${s.id}" 
          aria-label="${titleText}"
          style="
            width:36px;
            height:36px;
            border-radius:50%;
            background:${circleColor};
            border:2px solid ${borderColor};
            color:${textColor};
            font-weight:bold;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            margin:0 4px;
            padding:0;
            font-size:14px;
            transition:all 0.2s;
            position:relative;
          "
          onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)'; this.nextElementSibling.style.display='block';"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.nextElementSibling.style.display='none';"
          onfocus="this.style.transform='scale(1.15)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)'; this.nextElementSibling.style.display='block';"
          onblur="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.nextElementSibling.style.display='none';"
        >${i + 1}</button>
        <span class="step-tooltip" style="
          display:none;
          position:absolute;
          bottom:calc(100% + 8px);
          left:50%;
          transform:translateX(-50%);
          background:#1b1b1b;
          color:#fff;
          padding:6px 12px;
          border-radius:4px;
          white-space:nowrap;
          font-size:13px;
          z-index:1000;
          pointer-events:none;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        ">${titleText}</span>
      </span>`;
    }).join('<span style="display:inline-block;width:20px;height:2px;background:#dfe1e2;margin:0 -4px;vertical-align:middle;"></span>');
    return `<nav class="step-indicator margin-bottom-3" style="text-align:center;padding:1rem 0;">${circles}</nav>`;
  }

  app.appendChild(el(`
    ${renderBreadcrumb()}
    <div class="card">
      <div class="display-flex flex-justify flex-align-center">
        <h2 class="margin-y-0">${step.title}</h2>
        <div class="text-base text-ink">Step ${state.stepIndex + 1} of ${state.flow.steps.length}</div>
      </div>
      <p class="margin-top-2">${step.help || ""}</p>

      <div id="fields" class="margin-top-2"></div>
      <div id="messages" class="margin-top-2"></div>

      <div class="margin-top-3 display-flex flex-justify">
        <button class="usa-button usa-button--outline" id="back" ${state.stepIndex === 0 ? "disabled" : ""}>Back</button>
        <button class="usa-button" id="next" ${step.gateLint && lintStep(step).summary.hasErrors ? "disabled" : ""}>${step.id === "export_center" ? "Export" : step.id === "soo_output" ? "Accept & Continue" : "Next"}</button>
      </div>

      <hr class="margin-top-4" />
      <div class="usa-accordion" id="exportAccordion">
        <button class="usa-accordion__button" id="exportAccordionBtn" aria-expanded="false" aria-controls="exportAccordionContent">
          Export and reset <span id="accordionArrow">▼</span>
        </button>
        <div class="usa-accordion__content" id="exportAccordionContent" style="display:none;">
          <div class="margin-bottom-2">
            <strong>Export options:</strong>
            <ul class="usa-list">
              <li><button class="usa-button usa-button--outline" id="exportInputs">Download inputs.yml</button></li>
              <li><button class="usa-button usa-button--outline" id="downloadBundleZip">Download bundle.zip (all outputs)</button></li>
              <li><button class="usa-button usa-button--outline" id="downloadAuditJson">Download audit.json</button></li>
              <li><button class="usa-button usa-button--outline" id="downloadPromptsTxt">Download prompts.txt</button></li>
            </ul>
          </div>
          <button class="usa-button usa-button--outline" id="reset">Reset wizard</button>
        </div>
      </div>
    </div>
  `));

  const fields = app.querySelector("#fields");
  
  // Special handling for readiness_results: auto-populate
  if (step.id === "readiness_results") {
    const summary = analyzeReadiness();
    setAnswer("readiness_results", "readiness_summary", summary);
  }

  // Special handling for soo_review_gate: checkboxes are just UI, no auto-action
  if (step.id === "soo_review_gate") {
    // These are manual confirmations before generation
  }

  // Special handling for pws_vendor_pack: auto-generate preview
  if (step.id === "pws_vendor_pack") {
    // Will be populated during render below
  }

  // Special handling for export_center: show summary
  if (step.id === "export_center") {
    const summary = `
Wizard Complete. Your export includes:
- inputs.yml: All your answers and settings
- outputs/soo.md: Final SOO Markdown
- outputs/pws_request_pack.md: Vendor instruction pack
- audit.json: Readiness scores, lint results, AI call logs
- prompts.txt: All LLM prompts used (for transparency)

Click "Download bundle.zip" below to get everything.
    `.trim();
    setAnswer("export_center", "export_summary", summary);
  }

  if (step.fields?.length) {
    if (fields) {
      step.fields.forEach(f => {
        const fieldNode = renderField(step.id, f);
        if (fieldNode) fields.appendChild(fieldNode);
      });
    }
  } else {
    if (fields) fields.appendChild(el(`<p class="text-base">No fields on this step.</p>`));
  }

  // If soo_output, populate soo_draft field
  if (step.id === "soo_output") {
    const existing = getAnswer("soo_output", "soo_draft", "");
    if (existing) {
      const ta = fields.querySelector("textarea");
      if (ta) {
        ta.classList.add("large-textarea");
        ta.value = existing;
      }
    }
  }

  // If pws_vendor_pack, auto-generate preview
  if (step.id === "pws_vendor_pack") {
    const soo = getAnswer("soo_output", "soo_draft", "");
    if (!soo) {
      fields.appendChild(el(`<div class="usa-alert usa-alert--warning"><div class="usa-alert__body"><p>No SOO generated yet. Go back and complete SOO generation first.</p></div></div>`));
    } else {
      const pwsPack = generatePwsRequestPack(soo);
      setAnswer("pws_vendor_pack", "pws_pack_preview", pwsPack);
      const ta = fields.querySelector("textarea");
      if (ta) {
        ta.classList.add("large-textarea");
        ta.value = pwsPack;
      }
    }
  }

  // If generate step, show SOO draft textarea for editing
  if (step.id === "generate" && fields) {
    const draft = getAnswer("soo_output", "soo_draft", "");
    fields.innerHTML = `
      <div class="margin-bottom-2">
        <div class="display-flex flex-justify flex-align-center margin-bottom-1">
          <label for="soo_draft" class="usa-label margin-y-0">SOO Markdown (editable)</label>
          <button class="usa-button usa-button--unstyled" id="expandDraft" title="Expand to full screen" style="padding:0.5rem;font-size:1.2rem;">⛶</button>
        </div>
        <textarea id="soo_draft" class="usa-textarea large-textarea" rows="25" style="font-family:monospace;font-size:14px;width:100%;box-sizing:border-box;">${escapeHtml(draft)}</textarea>
        <div class="usa-hint">Edit if needed. Click 'Regenerate' to rewrite with AI, or 'Next' to accept.</div>
      </div>
    `;
    // Save changes to draft
    const draftField = fields.querySelector('#soo_draft');
    if (draftField) {
      draftField.addEventListener('input', e => {
        setAnswer("soo_output", "soo_draft", e.target.value);
      });
    }
    // Full-screen expand functionality
    const expandBtn = fields.querySelector('#expandDraft');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const isExpanded = draftField.classList.contains('fullscreen-editor');
        if (isExpanded) {
          draftField.classList.remove('fullscreen-editor');
          expandBtn.textContent = '⛶';
          expandBtn.title = 'Expand to full screen';
          document.body.style.overflow = '';
        } else {
          draftField.classList.add('fullscreen-editor');
          expandBtn.textContent = '⛶';
          expandBtn.title = 'Exit full screen';
          document.body.style.overflow = 'hidden';
          draftField.focus();
        }
      });
      // Add ESC key listener to exit full-screen
      draftField.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && draftField.classList.contains('fullscreen-editor')) {
          expandBtn.click();
        }
      });
    }
    // Add CSS for full-screen mode
    if (!document.getElementById('fullscreen-editor-style')) {
      const style = document.createElement('style');
      style.id = 'fullscreen-editor-style';
      style.textContent = `
        .fullscreen-editor {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 10000 !important;
          margin: 0 !important;
          padding: 2rem !important;
          border: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  const backBtn = app.querySelector("#back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      render();
    });
  }

  // Step circle navigation click handler
  const stepCircles = app.querySelectorAll('.step-circle');
  if (stepCircles) {
    stepCircles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stepId = btn.getAttribute('data-step');
        const idx = state.flow.steps.findIndex(s => s.id === stepId);
        if (idx >= 0 && idx !== state.stepIndex) {
          state.stepIndex = idx;
          render();
        }
      });
    });
  }

  const nextBtn = app.querySelector("#next");
  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      const messages = app.querySelector("#messages");
      if (!messages) return;
      messages.innerHTML = "";

    // Gate: Check required checkboxes
    if (step.id === "soo_review_gate") {
      const allChecked = 
        getAnswer("soo_review_gate", "check_no_tasks", false) &&
        getAnswer("soo_review_gate", "check_problem_current_state", false) &&
        getAnswer("soo_review_gate", "check_objectives_outcomes", false) &&
        getAnswer("soo_review_gate", "check_constraints_boundaries", false) &&
        getAnswer("soo_review_gate", "check_vision_not_solution", false);
      
      if (!allChecked) {
        messages.appendChild(el(`
          <div class="usa-alert usa-alert--error">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">All checkboxes required</h3>
              <p>Check each box to confirm your SOO meets compliance standards.</p>
            </div>
          </div>
        `));
        return;
      }
    }

    // Gate: Lint check on soo_inputs
    if (step.gateLint && step.id !== "generate") {
      const lint = lintStep(step);
      if (lint.summary.hasErrors) {
        messages.appendChild(renderLintAlert(lint));
        return;
      }
    }

    if (step.id === "generate") {
      await runGeneration(app);
      return;
    }

    if (step.id === "soo_output") {
      // Collect edited SOO and move to PWS pack
      const ta = fields.querySelector("textarea");
      if (ta) {
        setAnswer("soo_output", "soo_draft", ta.value);
      }
    }

    if (step.id === "export_center") {
      // Trigger the bundle download
      const sooMd = getAnswer("soo_output", "soo_draft", "");
      const pwsMd = getAnswer("pws_vendor_pack", "pws_pack_preview", "");
      const auditJson = JSON.stringify(state.audit, null, 2);
      const promptsTxt = [state.prompts.soo?.template, state.prompts.pws?.template, state.prompts.rewrite?.template].filter(Boolean).join('\n\n---\n\n');
      function markdownToHtml(md) {
        let html = md
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
          .replace(/\*(.*?)\*/gim, '<i>$1</i>')
          .replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>')
          .replace(/\n/g, '<br>');
        html = html.replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>');
        return `<html><body>${html}</body></html>`;
      }
      function textToDocx(text) {
        const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>${escapeHtml(text)}</w:t></w:r></w:p>
          </w:body>
        </w:document>`;
        return xml;
      }
      const files = {
        "inputs.yml": buildInputsYml(),
        "outputs/soo.md": sooMd,
        "outputs/soo.html": markdownToHtml(sooMd),
        "outputs/soo.docx.xml": textToDocx(sooMd),
        "outputs/pws_request_pack.md": pwsMd,
        "outputs/pws_request_pack.html": markdownToHtml(pwsMd),
        "outputs/pws_request_pack.docx.xml": textToDocx(pwsMd),
        "audit.json": auditJson,
        "prompts.txt": promptsTxt
      };
      // Generate filename with product name and timestamp
      const productName = getAnswer("vision_moore", "product_name", "") || getAnswer("vision", "product", "") || "SOO";
      const sanitizedName = productName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `${sanitizedName}-${timestamp}.zip`;
      downloadZip(filename, files);
      messages.appendChild(el(`
        <div class="usa-alert usa-alert--success margin-top-2">
          <div class="usa-alert__body">
            <p>✓ Bundle downloaded successfully!</p>
          </div>
        </div>
      `));
      return;
    }

    state.stepIndex = Math.min(state.flow.steps.length - 1, state.stepIndex + 1);
    render();
    });
  }

  // Accordion logic
  const accordionBtn = app.querySelector('#exportAccordionBtn');
  const accordionContent = app.querySelector('#exportAccordionContent');
  const accordionArrow = app.querySelector('#accordionArrow');
  if (accordionBtn && accordionContent && accordionArrow) {
    accordionBtn.addEventListener('click', () => {
      const isExpanded = accordionBtn.getAttribute('aria-expanded') === 'true';
      const willExpand = !isExpanded;
      accordionBtn.setAttribute('aria-expanded', String(willExpand));
      accordionContent.style.display = willExpand ? 'block' : 'none';
      accordionArrow.textContent = willExpand ? '▲' : '▼';
    });
  }

  // Prepare export variables once at the top
  const sooMd = getAnswer("soo_output", "soo_draft", "");
  const pwsMd = getAnswer("pws_vendor_pack", "pws_pack_preview", "");
  const auditJson = JSON.stringify(state.audit, null, 2);
  const promptsTxt = [state.prompts.soo?.template, state.prompts.pws?.template, state.prompts.rewrite?.template].filter(Boolean).join('\n\n---\n\n');
  function markdownToHtml(md) {
    let html = md
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/\*(.*?)\*/gim, '<i>$1</i>')
      .replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    html = html.replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>');
    return `<html><body>${html}</body></html>`;
  }
  function textToDocx(text) {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>${escapeHtml(text)}</w:t></w:r></w:p>
      </w:body>
    </w:document>`;
    return xml;
  }

  // Export buttons
  const exportInputsBtn = app.querySelector('#exportInputs');
  if (exportInputsBtn) {
    exportInputsBtn.addEventListener("click", () => {
      downloadText("inputs.yml", buildInputsYml());
    });
  }
  const downloadBundleZipBtn = app.querySelector('#downloadBundleZip');
  if (downloadBundleZipBtn) {
    downloadBundleZipBtn.addEventListener('click', () => {
      const files = {
        "inputs.yml": buildInputsYml(),
        "outputs/soo.md": sooMd,
        "outputs/soo.html": markdownToHtml(sooMd),
        "outputs/soo.docx.xml": textToDocx(sooMd),
        "outputs/pws_request_pack.md": pwsMd,
        "outputs/pws_request_pack.html": markdownToHtml(pwsMd),
        "outputs/pws_request_pack.docx.xml": textToDocx(pwsMd),
        "audit.json": auditJson,
        "prompts.txt": promptsTxt
      };
      downloadZip('bundle.zip', files);
    });
  }
  const downloadAuditJsonBtn = app.querySelector('#downloadAuditJson');
  if (downloadAuditJsonBtn) {
    downloadAuditJsonBtn.addEventListener('click', () => {
      const auditJson = JSON.stringify(state.audit, null, 2);
      downloadText('audit.json', auditJson);
    });
  }
  const downloadPromptsTxtBtn = app.querySelector('#downloadPromptsTxt');
  if (downloadPromptsTxtBtn) {
    downloadPromptsTxtBtn.addEventListener('click', () => {
      const promptsTxt = [state.prompts.soo?.template, state.prompts.pws?.template, state.prompts.rewrite?.template].filter(Boolean).join('\n\n---\n\n');
      downloadText('prompts.txt', promptsTxt);
    });
  }

  // Export Center: add HTML and DOCX to ZIP
  if (step.id === "export_center") {
    // Helper: Simple Markdown to HTML converter (basic)
    function markdownToHtml(md) {
      let html = md
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*?)\*/gim, '<i>$1</i>')
        .replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>')
        .replace(/\n/g, '<br>');
      html = html.replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>');
      return `<html><body>${html}</body></html>`;
    }
    // Helper: Minimal DOCX generator (Word XML)
    function textToDocx(text) {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>${escapeHtml(text)}</w:t></w:r></w:p>
        </w:body>
      </w:document>`;
      return xml;
    }
    const sooMd = getAnswer("soo_output", "soo_draft", "");
    const pwsMd = getAnswer("pws_vendor_pack", "pws_pack_preview", "");
    const auditJson = JSON.stringify(state.audit, null, 2);
    const promptsTxt = [state.prompts.soo?.template, state.prompts.pws?.template, state.prompts.rewrite?.template].filter(Boolean).join('\n\n---\n\n');
    const files = {
      "inputs.yml": buildInputsYml(),
      "outputs/soo.md": sooMd,
      "outputs/soo.html": markdownToHtml(sooMd),
      "outputs/soo.docx.xml": textToDocx(sooMd),
      "outputs/pws_request_pack.md": pwsMd,
      "outputs/pws_request_pack.html": markdownToHtml(pwsMd),
      "outputs/pws_request_pack.docx.xml": textToDocx(pwsMd),
      "audit.json": auditJson,
      "prompts.txt": promptsTxt
    };
    // Add export button to download ZIP
    let exportBtn = document.getElementById('downloadBundleZip');
    if (!exportBtn) {
      exportBtn = document.createElement('button');
      exportBtn.id = 'downloadBundleZip';
      exportBtn.className = 'usa-button margin-top-2';
      exportBtn.textContent = 'Download bundle.zip';
      app.appendChild(exportBtn);
    }
    exportBtn.onclick = () => downloadZip('bundle.zip', files);
  }

  const resetBtn = app.querySelector("#reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all answers? This cannot be undone.")) {
        state.answers = {};
        state.audit = { events: [] };
        saveState();
        state.stepIndex = 0;
        render();
      }
    });
  }
}

function renderField(stepId, f) {
  const value = getAnswer(stepId, f.id, f.default ?? "");

  if (f.readonly) {
    // Read-only field (auto-generated)
    return el(`
      <div class="margin-bottom-2">
        <label class="usa-label" for="${stepId}.${f.id}">${f.label}</label>
        ${f.hint ? `<div class="usa-hint">${f.hint}</div>` : ""}
        <textarea class="usa-textarea" id="${stepId}.${f.id}" rows="${f.rows || 6}" readonly>${escapeHtml(value)}</textarea>
      </div>
    `);
  }

  if (f.type === "checkbox") {
    const checked = value ? "checked" : "";
    const node = el(`
      <div class="margin-bottom-2">
        <div class="usa-checkbox">
          <input class="usa-checkbox__input" type="checkbox" id="${stepId}.${f.id}" ${checked} ${f.required ? "required" : ""} />
          <label class="usa-checkbox__label" for="${stepId}.${f.id}">${f.label}</label>
        </div>
      </div>
    `);
    node.querySelector("input").addEventListener("change", e => setAnswer(stepId, f.id, e.target.checked));
    return node;
  }

  if (f.type === "select") {
    const opts = (f.options || []).map(o => {
      const selected = value === o.value ? "selected" : "";
      return `<option value="${escapeHtml(o.value)}" ${selected}>${escapeHtml(o.label)}</option>`;
    }).join("");
    const node = el(`
      <div class="margin-bottom-2">
        <label class="usa-label" for="${stepId}.${f.id}">${f.label}</label>
        ${f.hint ? `<div class="usa-hint">${f.hint}</div>` : ""}
        <select class="usa-select" id="${stepId}.${f.id}">
          ${opts}
        </select>
      </div>
    `);
    node.querySelector("select").addEventListener("change", e => setAnswer(stepId, f.id, e.target.value));
    return node;
  }

  if (f.type === "textarea") {
    const node = el(`
      <div class="margin-bottom-2">
        <label class="usa-label" for="${stepId}.${f.id}">${f.label}</label>
        ${f.hint ? `<div class="usa-hint">${f.hint}</div>` : ""}
        <textarea class="usa-textarea" id="${stepId}.${f.id}" rows="${f.rows || 6}">${escapeHtml(value)}</textarea>
      </div>
    `);
    node.querySelector("textarea").addEventListener("input", e => setAnswer(stepId, f.id, e.target.value));
    return node;
  }

  const node = el(`
    <div class="margin-bottom-2">
      <label class="usa-label" for="${stepId}.${f.id}">${f.label}</label>
      ${f.hint ? `<div class="usa-hint">${f.hint}</div>` : ""}
      <input class="usa-input" id="${stepId}.${f.id}" value="${escapeHtml(value)}" />
    </div>
  `);
  node.querySelector("input").addEventListener("input", e => setAnswer(stepId, f.id, e.target.value));
  return node;
}

function compileRules() {
  const doc = state.rules;
  const disallow = doc?.lint?.disallow || [];
  const warn = doc?.lint?.warn || [];
  return { disallow, warn };
}

function lintText(text) {
  const { disallow, warn } = compileRules();
  const findings = [];

  const run = (rules, severity) => {
    for (const r of rules) {
      const re = new RegExp(r.pattern, "gi");
      let m;
      while ((m = re.exec(text)) !== null) {
        findings.push({ id: r.id, severity, match: m[0], index: m.index, message: r.message });
      }
    }
  };

  run(disallow, "error");
  run(warn, "warn");

  return {
    summary: {
      hasErrors: findings.some(f => f.severity === "error"),
      errorCount: findings.filter(f => f.severity === "error").length,
      warnCount: findings.filter(f => f.severity === "warn").length
    },
    findings
  };
}

function lintStep(step) {
  const parts = [];
  for (const f of step.fields) {
    const v = getAnswer(step.id, f.id, "");
    parts.push(String(v || ""));
  }
  return lintText(parts.join("\n"));
}

function renderLintAlert(lint) {
  const items = lint.findings.map(f => `<li><strong>${f.severity.toUpperCase()}</strong> ${escapeHtml(f.message)} <span class="mono">${escapeHtml(f.match)}</span></li>`).join("");
  return el(`
    <div class="usa-alert usa-alert--error">
      <div class="usa-alert__body">
        <h3 class="usa-alert__heading">Fix these issues before continuing</h3>
        <ul class="usa-list">${items}</ul>
      </div>
    </div>
  `);
}

function buildInputsYml() {
  const inputs = {
    version: 1,
    metadata: {
      createdAt: new Date().toISOString(),
      wizardVersion: "2.0"
    },
    readiness: {
      has_po: getAnswer("readiness", "has_po", ""),
      end_user_access: getAnswer("readiness", "end_user_access", ""),
      approvals_cycle: getAnswer("readiness", "approvals_cycle", "")
    },
    product_vision_board: {
      vision: getAnswer("vision", "vision", ""),
      target_group: getAnswer("vision", "target_group", ""),
      needs: getAnswer("vision", "needs", ""),
      product: getAnswer("vision", "product", ""),
      business_goals: getAnswer("vision", "business_goals", "")
    },
    product_vision_moore: {
      target_customer: getAnswer("vision_moore", "target_customer", ""),
      customer_need: getAnswer("vision_moore", "customer_need", ""),
      product_name: getAnswer("vision_moore", "product_name", ""),
      product_category: getAnswer("vision_moore", "product_category", ""),
      key_benefit: getAnswer("vision_moore", "key_benefit", ""),
      alternative: getAnswer("vision_moore", "alternative", ""),
      differentiation: getAnswer("vision_moore", "differentiation", ""),
      moore_statement: buildMooreStatement()
    },
    methodology: {
      context: getAnswer("methodology", "context", "new_dev")
    },
    soo_inputs: {
      problem_context: getAnswer("soo_inputs", "problem_context", ""),
      objectives: getAnswer("soo_inputs", "objectives", ""),
      constraints: getAnswer("soo_inputs", "constraints", "")
    }
  };

  return window.jsyaml.dump(inputs, { noRefs: true });
}

function renderTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

// Generate a basic PWS request pack (fallback if no LLM)
function generatePwsRequestPack(soo) {
  return `# Vendor Instruction Pack: Responding to the Statement of Objectives (SOO)

## Introduction

The Government has provided a Statement of Objectives (SOO) that defines WHAT we need to achieve and WHAT constraints apply. The SOO does NOT prescribe HOW you will work or WHAT you will deliver—that is your (the vendor's) decision in your Performance Work Statement (PWS).

Your task: Read the Government SOO below and respond with a Performance Work Statement that proposes your approach, work breakdown, deliverables, schedule, and acceptance criteria.

## Government-Provided SOO

${soo}

## Your PWS Proposal: What We Expect

Your proposal must address each Government objective and constraint. Include:

### 1. Proposed Approach and Methodology

For each Government objective, describe:
- How will you achieve it?
- What approach or methodology will you use?
- How will you measure success?

### 2. Work Breakdown Structure (WBS) and Tasks

Break down the work into manageable tasks that ladder up to each Government objective.
Document dependencies and sequencing.

### 3. Deliverables and Schedule

List all deliverables (code, documentation, training, etc.).
Provide a realistic schedule with key milestones.
Map each deliverable to one or more Government objectives.

### 4. Quality Assurance and Acceptance Criteria

Define how the Government will verify that each objective is met.
Propose testing, review, and acceptance procedures.
Define acceptance criteria aligned to Government objectives.

### 5. Resource Plan and Key Personnel

Identify team members and roles.
Provide relevant experience and past performance.
Describe how you will manage risk and quality.

## Critical Reminders

- **You decide HOW; Government defined WHAT.** The SOO lists objectives (outcomes) and constraints (boundaries). You propose the tasks, design, technology, and delivery approach.
- **Map everything to objectives.** Each task and deliverable should trace back to at least one Government objective.
- **Compliance is mandatory.** All constraints (compliance rules, schedules, environment limits) are non-negotiable.
- **Acceptance is outcome-focused.** The Government will accept work based on whether objectives are achieved within constraints, not on effort or activity.

## Submission Checklist

Before submitting your proposal, confirm:
- ☐ All Government objectives are addressed
- ☐ All constraints are acknowledged and incorporated into your approach
- ☐ WBS and tasks are clearly mapped to objectives
- ☐ Deliverables and schedule are realistic and traceable to objectives
- ☐ Quality assurance and acceptance criteria align to objectives
- ☐ Team and past performance demonstrate capability
- ☐ Risks and mitigation strategies are identified
- ☐ No unexpected scope additions; proposal responds to SOO as written

**Questions?** Contact the Government at [point of contact].

`;
}

async function runGeneration(app) {
  const messages = app.querySelector("#messages");
  messages.innerHTML = "";

  const sooStep = state.flow.steps.find(s => s.id === "soo_inputs");
  const lint = lintStep(sooStep);
  if (lint.summary.hasErrors) {
    messages.appendChild(renderLintAlert(lint));
    return;
  }

  const endpoint = aiConfig.aiEndpoint.trim();
  const model = aiConfig.model.trim();
  const timeout = aiConfig.timeout * 1000;

  // Always show prompt and manual input option
  // Declare shared variables once at the top
  // Declare shared variables once at the top
  // ...existing code...

  // Prompt card (always shown)
  const promptCard = el(`
    <div class="card margin-top-2">
      <h4>1. Copy this prompt and run through your local LLM</h4>
      <textarea class="usa-textarea mono" readonly rows="10" id="promptText"></textarea>
      <button class="usa-button usa-button--outline margin-top-2" id="copyPrompt">Copy prompt</button>
    </div>
  `);
  promptCard.querySelector("#promptText").value = prompt;
  promptCard.querySelector("#copyPrompt").addEventListener("click", () => {
    promptCard.querySelector("#promptText").select();
    document.execCommand("copy");
    alert("Prompt copied to clipboard!");
  });

  // Output card (always shown)
  const outputCard = el(`
    <div class="card margin-top-2">
      <h4>2. Paste the AI output here</h4>
      <textarea class="usa-textarea mono" rows="15" id="sooText" placeholder="Paste AI response here..."></textarea>
      <button class="usa-button margin-top-2" id="acceptOutput">Accept output & continue</button>
    </div>
  `);
  outputCard.querySelector("#acceptOutput").addEventListener("click", () => {
    const output = outputCard.querySelector("#sooText").value;
    if (!output.trim()) {
      alert("Please paste the AI output before continuing.");
      return;
    }
    const outLint = lintText(output);
    const msgDiv = el(`<div id="tempMessages"></div>`);
    if (outLint.summary.hasErrors) {
      msgDiv.appendChild(el(`
        <div class="usa-alert usa-alert--error">
          <div class="usa-alert__body">
            <h3 class="usa-alert__heading">Generated SOO has lint issues</h3>
            <p class="usa-alert__text">Consider regenerating or editing to fix violations.</p>
          </div>
        </div>
      `));
      msgDiv.appendChild(renderLintAlert(outLint));
    }
    messages.appendChild(msgDiv);
    setAnswer("soo_output", "soo_draft", output);
    state.audit.events.push({
      timestamp: new Date().toISOString(),
      event: "soo_draft_accepted",
      lintSummary: outLint.summary
    });
    setTimeout(() => {
      app.querySelector("#next").click();
    }, 500);
  });

  messages.appendChild(promptCard);
  messages.appendChild(outputCard);

  // If endpoint is missing, skip AI call
  if (!endpoint) {
    messages.appendChild(el(`
      <div class="usa-alert usa-alert--warning">
        <div class="usa-alert__body">
          <h3 class="usa-alert__heading">No AI endpoint configured</h3>
          <p>Running in prompt-only mode. Copy the prompt above, run it through your local LLM, and paste the output below.</p>
        </div>
      </div>
    `));
    return;
  }

  // LLM endpoint is configured
  const inputs = {
    vision: getAnswer("vision", "vision", ""),
    target_group: getAnswer("vision", "target_group", ""),
    needs: getAnswer("vision", "needs", ""),
    product: getAnswer("vision", "product", ""),
    business_goals: getAnswer("vision", "business_goals", ""),
    target_customer: getAnswer("vision_moore", "target_customer", ""),
    customer_need: getAnswer("vision_moore", "customer_need", ""),
    product_name: getAnswer("vision_moore", "product_name", ""),
    product_category: getAnswer("vision_moore", "product_category", ""),
    key_benefit: getAnswer("vision_moore", "key_benefit", ""),
    alternative: getAnswer("vision_moore", "alternative", ""),
    differentiation: getAnswer("vision_moore", "differentiation", ""),
    has_po: getAnswer("readiness", "has_po", ""),
    end_user_access: getAnswer("readiness", "end_user_access", ""),
    approvals_cycle: getAnswer("readiness", "approvals_cycle", ""),
    context: getAnswer("methodology", "context", "new_dev"),
    problem_context: getAnswer("soo_inputs", "problem_context", ""),
    objectives: getAnswer("soo_inputs", "objectives", ""),
    constraints: getAnswer("soo_inputs", "constraints", "")
  };

  const promptDoc = state.prompts.soo;
  const prompt = renderTemplate(promptDoc.template, inputs);

  messages.appendChild(el(`
    <div class="usa-alert usa-alert--info">
      <div class="usa-alert__body">
        <h3 class="usa-alert__heading">Calling local AI</h3>
        <div class="margin-top-1">
          <div>Endpoint: <span class="mono">${escapeHtml(endpoint)}</span></div>
          <div>Model: <span class="mono">${escapeHtml(model)}</span></div>
          <div>Timeout: ${timeout / 1000} seconds</div>
        </div>
      </div>
    </div>
  `));

  // Try AI call if endpoint is set
  if (endpoint) {
    let text = "";
    let aiError = false;
    try {
      const base = endpoint.replace(/\/$/, "");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const r = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!r.ok) {
        const err = await r.text();
        throw new Error(`Local AI error ${r.status}: ${err}`);
      }
      const data = await r.json();
      text = data?.response || "";
      state.audit.events.push({
        timestamp: new Date().toISOString(),
        event: "ai_call_success",
        endpoint,
        model,
        textLength: text.length
      });
    } catch (e) {
      aiError = true;
      messages.appendChild(el(`
        <div class="usa-alert usa-alert--error">
          <div class="usa-alert__body">
            <h3 class="usa-alert__heading">Local AI call failed</h3>
            <p class="usa-alert__text">${escapeHtml(e.message || "Unknown error")}</p>
            <p class="usa-alert__text">
              Check that Ollama is running at ${escapeHtml(endpoint)} and CORS is permitted.<br>
              You can also run in prompt-only mode: copy the prompt above and paste your own output below.
            </p>
          </div>
        </div>
      `));
      state.audit.events.push({
        timestamp: new Date().toISOString(),
        event: "ai_call_failed",
        error: e.message
      });
    }
    // If AI succeeded, show result in output textarea
    if (!aiError && text) {
      const outLint = lintText(text);
      const aiOutputCard = el(`
        <div class="card margin-top-3">
          <h3 class="margin-top-0">Generated SOO Draft (AI)</h3>
          <p class="text-base">Review and edit below. Click "Accept & Continue" to proceed, or paste your own output above.</p>
          <textarea class="usa-textarea mono" id="sooTextAI" rows="18"></textarea>
          <div class="margin-top-2 display-flex flex-justify">
            <button class="usa-button usa-button--outline" id="downloadPrompt">Download prompt.txt</button>
            <button class="usa-button" id="acceptOutputAI">Accept & Continue</button>
          </div>
        </div>
      `);
      aiOutputCard.querySelector("#sooTextAI").value = text || "";
      aiOutputCard.querySelector("#downloadPrompt").addEventListener("click", () => {
        downloadText("prompt.txt", prompt);
      });
      aiOutputCard.querySelector("#acceptOutputAI").addEventListener("click", () => {
        const output = aiOutputCard.querySelector("#sooTextAI").value;
        setAnswer("soo_output", "soo_draft", output);
        state.audit.events.push({
          timestamp: new Date().toISOString(),
          event: "soo_draft_accepted",
          lintSummary: outLint.summary
        });
        state.stepIndex++;
        render();
      });
      // Show lint results
      if (outLint.summary.hasErrors) {
        messages.appendChild(el(`
          <div class="usa-alert usa-alert--warning">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">Generated SOO has issues</h3>
              <p class="usa-alert__text">Review and edit below to fix violations, or paste your own output above.</p>
            </div>
          </div>
        `));
        messages.appendChild(renderLintAlert(outLint));
      } else {
        messages.appendChild(el(`
          <div class="usa-alert usa-alert--success">
            <div class="usa-alert__body">
              <p class="usa-alert__text">✓ Generated SOO passes lint checks.</p>
            </div>
          </div>
        `));
      }
      messages.appendChild(aiOutputCard);
    }
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadZip(filename, files) {
  const z = {};
  for (const [path, content] of Object.entries(files)) {
    z[path] = window.fflate.strToU8(String(content));
  }
  const zipped = window.fflate.zipSync(z, { level: 9 });
  const blob = new Blob([zipped], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Wizard navigation and URL mapping
function getStepIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('step');
}
function setStepUrl(stepId) {
  const url = `${window.location.pathname}?step=${stepId}`;
  window.history.pushState({ stepId }, '', url);
}
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.stepId) {
    const idx = state.flow.steps.findIndex(s => s.id === e.state.stepId);
    if (idx >= 0) {
      state.stepIndex = idx;
      render();
    }
  }
});
function renderStageNav() {
  if (!state.flow || !state.flow.steps) return '';
  return `<nav class="usa-nav margin-bottom-2"><ul class="usa-list usa-list--unstyled display-flex flex-wrap">${state.flow.steps.map((step, i) => {
    const active = i === state.stepIndex ? 'usa-current' : '';
    return `<li><button class="usa-button usa-button--unstyled ${active}" data-step="${step.id}">${i+1}. ${step.title || step.id}</button></li>`;
  }).join('')}</ul></nav>`;
}

// Global AI config
let aiConfig = { aiEndpoint: '', model: '', timeout: 120 };
async function loadAiConfig() {
  try {
    const r = await fetch('./config.json');
    if (r.ok) {
      aiConfig = await r.json();
    } else {
      throw new Error('Failed to load config.json');
    }
  } catch (e) {
    console.warn('Could not load AI config:', e);
  }
}

async function boot() {
  console.log('[BOOT] Starting wizard boot sequence...');
  const app = document.querySelector("#app");
  app.innerHTML = '<div class="usa-alert usa-alert--info"><div class="usa-alert__body"><p>Loading wizard configuration...</p></div></div>';
  try {
    loadLocalAnswers();
    await loadAiConfig(); // Ensure aiConfig is loaded before rendering
    state.flow = await fetchYml(FLOW_URL);
    console.log('[BOOT] ✅ Flow loaded');
    state.rules = await fetchYml(LINT_RULES_URL);
    console.log('[BOOT] ✅ Rules loaded');
    state.prompts.soo = await fetchYml(PROMPT_SOO_URL);
    console.log('[BOOT] ✅ SOO prompt loaded');
    state.prompts.pws = await fetchYml(PROMPT_PWS_URL);
    console.log('[BOOT] ✅ PWS prompt loaded');
    state.prompts.rewrite = await fetchYml(PROMPT_REWRITE_URL);
    console.log('[BOOT] ✅ Rewrite prompt loaded');
    if (!navigator.onLine) showOfflineIndicator(true);
    console.log('[BOOT] ✅ All files loaded successfully. Rendering wizard...');
    // After loading config, set stepIndex from URL if present
    const urlStep = getStepIdFromUrl();
    if (urlStep) {
      const idx = state.flow.steps.findIndex(s => s.id === urlStep);
      if (idx >= 0) state.stepIndex = idx;
    }
    render();
  } catch (e) {
    console.error('[BOOT] ❌ Boot failed:', e);
    throw e;
  }
}

boot().catch(e => {
  console.error('[BOOT] ❌ Boot failed:', e);
  const app = document.querySelector("#app");
  app.innerHTML = `<div class="usa-alert usa-alert--error"><div class="usa-alert__body"><h3 class="usa-alert__heading">Failed to start</h3><p class="usa-alert__text">${escapeHtml(e.message)}</p></div></div>`;
});
