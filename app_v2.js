// SOO Wizard v2.0 - Updated 2025-12-02T23:15:00Z
// Force cache invalidation with timestamp
// Cache-busting with static version to force fresh YAML loads
const CACHE_BUST = "?v=20251230-160500";
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
  audit: { 
    metadata: {
      sessionStart: new Date().toISOString(),
      wizardVersion: "2.0"
    },
    readiness: {},
    lintResults: {},
    events: [],
    stepCompletions: []
  }
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

// Minimal markdown renderer for headings, paragraphs, and bullet lists
function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      return; // blank line -> break lists/paragraphs
    }
    if (trimmed.startsWith('## ')) {
      closeList();
      html += `<h3>${escapeHtml(trimmed.slice(3))}</h3>`;
    } else if (trimmed.startsWith('# ')) {
      closeList();
      html += `<h2>${escapeHtml(trimmed.slice(2))}</h2>`;
    } else if (trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${escapeHtml(trimmed.slice(2))}</li>`;
    } else {
      closeList();
      html += `<p>${escapeHtml(trimmed)}</p>`;
    }
  });

  closeList();
  return html;
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
  const has_po = getAnswer("readiness_assessment", "po_agile_training", "").toLowerCase();
  const end_user = getAnswer("readiness_assessment", "end_user_access", "").toLowerCase();
  
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
  const target = getAnswer("positioning_statement", "target_customer", "");
  const need = getAnswer("positioning_statement", "customer_need", "");
  const product = getAnswer("positioning_statement", "product_name", "");
  const category = getAnswer("positioning_statement", "product_category", "");
  const benefit = getAnswer("positioning_statement", "key_benefit", "");
  const alt = getAnswer("positioning_statement", "alternative", "");
  const diff = getAnswer("positioning_statement", "differentiation", "");
  
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

  // Step 4: Product Positioning Statement - add Vision Board context panel
  if (step.id === "positioning_statement") {
    const fields = app.querySelector("#fields");
    // Build the context panel HTML
    const visionKeys = [
      { key: "target_group", label: "Target group" },
      { key: "needs", label: "Needs (current state pain points)" },
      { key: "vision", label: "Vision (3–5 year outcome statement)" },
      { key: "product", label: "Product (key capabilities framed as outcomes)" },
      { key: "business_goals", label: "Business goals" }
    ];
    const visionAnswers = visionKeys.map(({ key, label }) => {
      const val = getAnswer("vision", key, "");
      return `<div class='margin-bottom-05'><strong>${label}:</strong> <span class='mono'>${val ? escapeHtml(val) : '<span style=\'color:#888\'>Not provided yet</span>'}</span></div>`;
    }).join("");
    const panel = document.createElement("div");
    panel.className = "usa-alert usa-alert--info margin-bottom-3";
    panel.innerHTML = `<div class='usa-alert__body'><h4 class='usa-alert__heading' style='margin-bottom:0.5em;'>From your Product Vision Board</h4>${visionAnswers}</div>`;
    if (fields) fields.parentNode.insertBefore(panel, fields);
  }

  // Auto-fill mapped Moore fields from Vision Board if blank, and update copy button UX
  if (step.id === "positioning_statement") {
    setTimeout(() => {
      const copyMap = [
        { moore: "target_customer", vision: "target_group", label: "Target group" },
        { moore: "customer_need", vision: "needs", label: "Needs / pain points" },
        { moore: "key_benefit", vision: "vision", label: "Vision (3–5 year outcome)" }
      ];
      copyMap.forEach(({ moore, vision, label }) => {
        const field = document.getElementById(`positioning_statement.${moore}`);
        const visionVal = getAnswer("vision", vision, "");
        // Auto-fill if blank
        if (field && !field.value && visionVal) {
          field.value = visionVal;
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
        // Add copy button
        if (field) {
          let btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = `Copy ${label}`;
          btn.className = "usa-button usa-button--unstyled margin-left-1";
          btn.style.fontSize = "0.95em";
          btn.addEventListener("click", () => {
            if (field.value && field.value !== visionVal) {
              if (!confirm(`This will replace the current value with the Vision Board's \"${label}\". Continue?`)) return;
            }
            if (visionVal) field.value = visionVal;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          });
          // Insert after label
          const labelNode = field.parentNode.querySelector("label");
          if (labelNode && !labelNode.parentNode.querySelector(".copy-from-vision")) {
            btn.classList.add("copy-from-vision");
            labelNode.appendChild(btn);
          }
        }
      });
    }, 0);
  }

  // Step 5: Add copy-forward link for Problem context from Vision Board "Needs"
  if (step.id === "soo_inputs") {
    setTimeout(() => {
      const field = document.getElementById("soo_inputs.problem_context");
      if (!field) return;
      const labelNode = field.parentNode.querySelector("label");
      if (!labelNode || labelNode.parentNode.querySelector(".copy-from-vision")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copy Needs / pain points";
      btn.className = "usa-button usa-button--unstyled margin-left-1 copy-from-vision";
      btn.style.fontSize = "0.95em";

      const updateDisabled = () => {
        const visionNeeds = getAnswer("vision", "needs", "");
        btn.disabled = !visionNeeds;
        btn.title = visionNeeds ? "Copy from Product Vision Board" : "Nothing to copy yet";
      };

      // Auto-fill on load if blank
      const visionNeedsInitial = getAnswer("vision", "needs", "");
      if (!field.value && visionNeedsInitial) {
        field.value = visionNeedsInitial;
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }

      updateDisabled();

      btn.addEventListener("click", () => {
        const visionNeeds = getAnswer("vision", "needs", "");
        if (!visionNeeds) return;
        if (field.value && field.value !== visionNeeds) {
          const ok = confirm("This will replace the current value with the Vision Board's \"Needs / pain points\". Continue?");
          if (!ok) return;
        }
        field.value = visionNeeds;
        field.dispatchEvent(new Event("input", { bubbles: true }));
      });

      labelNode.appendChild(btn);

      // If user navigates back and forth, re-enable when data appears
      const visionListener = () => updateDisabled();
      window.addEventListener("focus", visionListener, { once: true });

      // Draft objectives from prior steps (Vision + Positioning)
      const objField = document.getElementById("soo_inputs.objectives");
      const objLabel = objField?.parentNode.querySelector("label");
      if (objField && objLabel && !objLabel.parentNode.querySelector(".copy-from-vision-objectives")) {
        const objBtn = document.createElement("button");
        objBtn.type = "button";
        objBtn.textContent = "Draft objectives from vision";
        objBtn.className = "usa-button usa-button--unstyled margin-left-1 copy-from-vision-objectives";
        objBtn.style.fontSize = "0.95em";

        const buildDraft = () => {
          const parts = [
            getAnswer("positioning_statement", "key_benefit", ""),
            getAnswer("positioning_statement", "differentiation", ""),
            getAnswer("vision", "vision", ""),
            getAnswer("vision", "product", ""),
            getAnswer("vision", "business_goals", "")
          ].filter(Boolean);
          return parts.join("\n");
        };

        const updateObjDisabled = () => {
          const draft = buildDraft();
          objBtn.disabled = !draft;
          objBtn.title = draft ? "Copy drafted objectives" : "Nothing to copy yet";
        };

        // Auto-fill on load if blank
        const initialDraft = buildDraft();
        if (!objField.value && initialDraft) {
          objField.value = initialDraft;
          objField.dispatchEvent(new Event("input", { bubbles: true }));
        }

        updateObjDisabled();

        objBtn.addEventListener("click", () => {
          const draft = buildDraft();
          if (!draft) return;
          if (objField.value && objField.value !== draft) {
            const ok = confirm("This will replace the current value with drafted objectives from earlier steps. Continue?");
            if (!ok) return;
          }
          objField.value = draft;
          objField.dispatchEvent(new Event("input", { bubbles: true }));
        });

        objLabel.appendChild(objBtn);
        window.addEventListener("focus", () => updateObjDisabled(), { once: true });
      }
    }, 0);
  }

  // Step 6: Auto-fill methodology background and add refresh link
  if (step.id === "methodology") {
    setTimeout(() => {
      const bgField = document.getElementById("methodology.background");
      if (!bgField) return;

      const buildDraftBackground = () => {
        const regs = getAnswer("soo_inputs", "regulations", "");
        const stack = getAnswer("soo_inputs", "tech_stack", "");
        return [regs, stack].filter(Boolean).join("\n\n");
      };

      const combined = buildDraftBackground();
      if (!bgField.value && combined) {
        bgField.value = combined;
        bgField.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const labelNode = bgField.parentNode.querySelector("label");
      if (labelNode && !labelNode.parentNode.querySelector(".copy-background-from-previous")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Draft background from previous";
        btn.className = "usa-button usa-button--unstyled margin-left-1 copy-background-from-previous";
        btn.style.fontSize = "0.95em";

        const updateDisabled = () => {
          const draft = buildDraftBackground();
          btn.disabled = !draft;
          btn.title = draft ? "Copy from Regulations + Tech stack" : "Nothing to copy yet";
        };

        btn.addEventListener("click", () => {
          const draft = buildDraftBackground();
          if (!draft) return;
          if (bgField.value && bgField.value !== draft) {
            const ok = confirm("This will replace the current value with draft background from Regulations + Tech stack. Continue?");
            if (!ok) return;
          }
          bgField.value = draft;
          bgField.dispatchEvent(new Event("input", { bubbles: true }));
        });

        updateDisabled();
        labelNode.appendChild(btn);
        window.addEventListener("focus", () => updateDisabled(), { once: true });
      }
    }, 0);
  }

  // Update URL hash to reflect current step
  if (step && step.id) {
    const hash = `#${step.id}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash);
    }
  }

  // Breadcrumb navigation - visual step indicator
  function renderBreadcrumb() {
    if (!state.flow || !state.flow.steps) return "";
    const steps = state.flow.steps;
    const circles = steps.map((s, i) => {
      const isActive = i === state.stepIndex;
      const isPast = i < state.stepIndex;
      const circleColor = isActive ? '#005ea2' : isPast ? '#3b3f46' : '#dfe1e2';
      const textColor = isActive ? '#ffffff' : isPast ? '#ffffff' : '#1b1b1b';
      const borderColor = isActive ? '#005ea2' : isPast ? '#3b3f46' : '#d0d4d9';
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
      <div class="margin-top-2 usa-prose">${renderMarkdown(step.help || "")}</div>

      <div id="fields" class="margin-top-2"></div>
      <div id="messages" class="margin-top-2"></div>

      <div class="margin-top-3 display-flex flex-justify">
        <button class="usa-button usa-button--outline" id="back" ${state.stepIndex === 0 ? "disabled" : ""}>Back</button>
        <button class="usa-button" id="next">Next</button>
      </div>

      <hr class="margin-top-4" />
      <div class="usa-accordion" id="exportAccordion">
        <button class="usa-accordion__button" id="exportAccordionBtn" aria-expanded="false" aria-controls="exportAccordionContent">
          Import/Export/Reset <span id="accordionArrow">▼</span>
        </button>
        <div class="usa-accordion__content" id="exportAccordionContent" style="display:none;">
          <div class="margin-bottom-2">
            <strong>Import session:</strong>
            <div class="margin-top-1">
              <input type="file" id="importInputs" accept=".yml,.yaml" class="usa-file-input" style="max-width:400px;" />
              <p class="usa-hint margin-top-1">Upload a previously exported inputs.yml to restore your session</p>
            </div>
          </div>
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
    // Compute auto summary but don't overwrite user edits
    const autoSummary = analyzeReadiness();
    const existingSummary = getAnswer("readiness_results", "readiness_summary", "");
    const summaryToUse = existingSummary && existingSummary.trim().length > 0 ? existingSummary : autoSummary;
    setAnswer("readiness_results", "readiness_summary", summaryToUse);
    
    // Capture readiness assessment in audit
    const has_po = getAnswer("readiness_assessment", "po_agile_training", "").toLowerCase();
    const end_user = getAnswer("readiness_assessment", "end_user_access", "").toLowerCase();
    const hasPo = has_po.includes("yes");
    const hasUsers = end_user.includes("yes");
    
    let readinessLevel = "LOW";
    if (hasPo && hasUsers) readinessLevel = "STRONG";
    else if (hasPo || hasUsers) readinessLevel = "MEDIUM";
    
    state.audit.readiness = {
      timestamp: new Date().toISOString(),
      level: readinessLevel,
      has_product_owner: hasPo,
      has_end_user_access: hasUsers,
      summary: summaryToUse
    };
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

  // If soo_output, show critical review with AI-generated questions
  if (step.id === "soo_output") {
    const draft = getAnswer("soo_output", "soo_draft", "");
    const reviewQuestions = getAnswer("soo_output", "review_questions", "");
    
    if (!draft) {
      if (fields) {
        fields.innerHTML = `
          <div class="usa-alert usa-alert--warning">
            <div class="usa-alert__body">
              <p>This step requires a draft from Step 8 (Generate SOO draft). Redirecting you now…</p>
            </div>
          </div>
        `;
      }
      // Redirect back to generate step to collect draft
      setTimeout(() => {
        const targetIdx = state.flow.steps.findIndex(s => s.id === "generate");
        if (targetIdx >= 0) {
          state.stepIndex = targetIdx;
          render();
        } else {
          window.location.hash = "#generate";
        }
      }, 5000);
      return;
    }
    
    if (fields) {
      fields.innerHTML = `
        <div class="margin-bottom-3">
          <h3>Critical Review Questions</h3>
          <p class="usa-prose">Use these questions to critically evaluate your SOO draft and identify areas for improvement.</p>
          
          <div id="reviewQuestionsSection"></div>
          
          <div class="margin-bottom-2">
            <button class="usa-button" id="generateReviewBtn">Generate Review Questions with AI</button>
            <button class="usa-button usa-button--outline" id="copyReviewPromptBtn">Copy Review Prompt (for external AI)</button>
          </div>
          
          <div id="reviewStatus" class="margin-bottom-3"></div>
        </div>
        
        <div class="margin-bottom-2">
          <label for="soo_draft_review" class="usa-label">SOO Markdown (editable)</label>
          <div class="usa-hint">Review the questions above, then edit your SOO draft to address any concerns or improvements.</div>
          <textarea id="soo_draft_review" class="usa-textarea large-textarea" style="font-family:monospace;font-size:14px;">${escapeHtml(draft)}</textarea>
        </div>
      `;
      
      const draftField = fields.querySelector('#soo_draft_review');
      const reviewStatus = fields.querySelector('#reviewStatus');
      const generateReviewBtn = fields.querySelector('#generateReviewBtn');
      const copyReviewPromptBtn = fields.querySelector('#copyReviewPromptBtn');
      const reviewQuestionsSection = fields.querySelector('#reviewQuestionsSection');

      if (!isAiEnabled()) {
        generateReviewBtn.style.display = 'none';
        reviewStatus.innerHTML = `
          <div class="usa-alert usa-alert--info">
            <div class="usa-alert__body">
              <p>AI endpoint is not configured. Use "Copy Review Prompt" with your own AI tool, then paste the questions here.</p>
            </div>
          </div>
        `;
      }
      
      // Render existing questions as checkboxes if available
      const renderQuestions = (questions) => {
        // Ensure questions is a string
        if (!questions || typeof questions !== 'string') {
          console.log("renderQuestions called with invalid questions:", questions);
          return;
        }
        
        const lines = questions.split('\n');
        let checkboxesHtml = '';
        let questionIndex = 0;
        
        lines.forEach((line, idx) => {
          // Only match lines that start with - or * (bullet points), not numbered headers
          if (line.match(/^\s*[-*]\s+/)) {
            const checked = getAnswer("soo_output", `review_q_${questionIndex}`, false) ? 'checked' : '';
            const lineText = line.replace(/^\s*[-*]\s+/, '').trim();
            checkboxesHtml += `
              <div class="usa-checkbox margin-bottom-1">
                <input class="usa-checkbox__input review-checkbox" type="checkbox" id="review_q_${questionIndex}" data-index="${questionIndex}" ${checked} />
                <label class="usa-checkbox__label" for="review_q_${questionIndex}" style="font-weight:normal;">${escapeHtml(lineText)}</label>
              </div>
            `;
            questionIndex++;
          } else if (line.trim()) {
            // Section headers or other text - display as-is
            checkboxesHtml += `<div style="margin-bottom:0.5rem;${line.match(/^\d+\./) ? 'font-weight:bold;margin-top:1rem;' : ''}">${escapeHtml(line)}</div>`;
          }
        });
        
        reviewQuestionsSection.innerHTML = `
          <div class="card margin-bottom-2" style="background:#f9f9f9;padding:1.5rem;">
            <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:bold;">Review each question as you address it:</span>
              <span id="reviewProgress" style="color:#005ea2;font-weight:bold;">0 / ${questionIndex} reviewed</span>
            </div>
            ${checkboxesHtml}
          </div>
        `;
        
        document.querySelectorAll('.review-checkbox').forEach(checkbox => {
          checkbox.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            setAnswer("soo_output", `review_q_${index}`, e.target.checked);
            updateReviewProgress();
          });
        });
        
        updateReviewProgress();
      };
      
      const updateReviewProgress = () => {
        const total = document.querySelectorAll('.review-checkbox').length;
        const checked = document.querySelectorAll('.review-checkbox:checked').length;
        const progress = document.querySelector('#reviewProgress');
        if (progress) {
          progress.textContent = `${checked} / ${total} reviewed`;
          if (checked === total) {
            progress.style.color = '#00a91c';
            progress.textContent = `✓ ${checked} / ${total} reviewed`;
          }
        }
      };
      
      // Initialize with existing questions or show prompt
      if (reviewQuestions && typeof reviewQuestions === 'string' && reviewQuestions.trim()) {
        renderQuestions(reviewQuestions);
      } else {
        reviewQuestionsSection.innerHTML = `
          <div class="usa-alert usa-alert--info margin-bottom-2">
            <div class="usa-alert__body">
              <p>Generate critical review questions to help improve your SOO draft.</p>
            </div>
          </div>
        `;
      }
      
      // Save draft changes
      draftField.addEventListener('input', e => {
        setAnswer("soo_output", "soo_draft", e.target.value);
      });
      
      // Build review prompt
      const buildReviewPrompt = () => {
        return `You are an expert procurement advisor reviewing a Statement of Objectives (SOO) for a federal agency. Your role is to critically evaluate the SOO and generate thoughtful questions that will help the author improve it.

INSTRUCTIONS:
1. Read the SOO draft carefully
2. Identify potential gaps, ambiguities, or areas that need strengthening
3. Generate 8-12 critical review questions that prompt deeper thinking
4. Focus on: clarity, completeness, measurability, compliance, feasibility, and vendor understanding
5. CRITICAL FORMAT REQUIREMENT: Each question must start with "- " (dash and space) for proper checkbox generation

REQUIRED FORMAT EXAMPLE:
- 1.a Question about objective clarity and measurability?
- 1.b Question about success criteria definition?
- 1.c Question about measurement methodology?
- 2.a Question about technical feasibility and constraints?
- 2.b Question about implementation approach?
- 2.c Question about vendor capability requirements?

FORMATTING RULES:
- Every question must start with "- " (dash and space)
- Use consistent numbering: 1.a, 1.b, 1.c, then 2.a, 2.b, 2.c, etc.
- Generate 2-4 sub-questions (a, b, c, d) for each major topic area
- Aim for 3-4 major topics with sub-questions for comprehensive coverage

SOO DRAFT:
${draft}

GENERATE CRITICAL REVIEW QUESTIONS (MUST START EACH QUESTION WITH "- "):`;
      };
      
      const reviewPrompt = buildReviewPrompt();
      
      // Copy review prompt
      copyReviewPromptBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(reviewPrompt).then(() => {
          reviewStatus.innerHTML = `
            <div class="usa-alert usa-alert--success">
              <div class="usa-alert__body">
                <p>✓ Review prompt copied! Paste it into your AI tool, then paste the response back here using "Generate Review Questions".</p>
              </div>
            </div>
          `;
        }).catch(() => {
          const tempTextarea = document.createElement('textarea');
          tempTextarea.value = reviewPrompt;
          document.body.appendChild(tempTextarea);
          tempTextarea.select();
          document.execCommand('copy');
          document.body.removeChild(tempTextarea);
          reviewStatus.innerHTML = `
            <div class="usa-alert usa-alert--success">
              <div class="usa-alert__body">
                <p>✓ Review prompt copied! Paste it into your AI tool, then paste the response back here using "Generate Review Questions".</p>
              </div>
            </div>
          `;
        });
      });
      
      // Generate review questions with AI
      generateReviewBtn.addEventListener('click', async () => {
        const endpoint = aiConfig.aiEndpoint?.trim();
        const model = aiConfig.model?.trim();
        const timeout = aiConfig.timeout * 1000;
        
        if (!endpoint) {
          reviewStatus.innerHTML = `
            <div class="usa-alert usa-alert--warning">
              <div class="usa-alert__body">
                <h3 class="usa-alert__heading">No AI endpoint configured</h3>
                <p>Click "Copy Review Prompt" above, paste it into your AI tool, then manually paste the questions into the review section.</p>
              </div>
            </div>
          `;
          return;
        }
        
        reviewStatus.innerHTML = `
          <div class="usa-alert usa-alert--info">
            <div class="usa-alert__body">
              <p><strong>Generating critical review questions... Please wait</strong></p>
            </div>
          </div>
        `;
        generateReviewBtn.disabled = true;
        
        try {
          const base = endpoint.replace(/\/$/, "");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          const r = await fetch(`${base}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, prompt: reviewPrompt, stream: false }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!r.ok) {
            const err = await r.text();
            throw new Error(`AI error ${r.status}: ${err}`);
          }
          
          const data = await r.json();
          const questions = data?.response || "";
          
          if (questions) {
            setAnswer("soo_output", "review_questions", questions);
            
            // Parse questions and create checkboxes
            const lines = questions.split('\n');
            let checkboxesHtml = '';
            let questionIndex = 0;
            
            // Clear all existing checkbox states when generating new questions
            const existingCheckboxStates = {};
            for (let i = 0; i < 20; i++) { // Clear up to 20 potential previous checkboxes
              if (state.answers.soo_output && state.answers.soo_output[`review_q_${i}`] !== undefined) {
                delete state.answers.soo_output[`review_q_${i}`];
              }
            }
            
            lines.forEach((line, idx) => {
              // Match lines that start with bullets (- or *), numbers (1., 2., etc.), or sub-numbers (1.a, 1.b, etc.)
              if (line.match(/^\s*[-*]\s+/) || line.match(/^\s*\d+\.\s+/) || line.match(/^\s*\d+\.[a-z][\.\s]/)) {
                // Always start with unchecked state for AI-generated questions
                let lineText = line.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '').replace(/^\s*\d+\.[a-z][\.\s]\s*/, '').trim();
                
                // Strip markdown formatting for HTML display
                lineText = lineText
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold** to <strong>
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic* to <em>
                  .replace(/`(.*?)`/g, '<code>$1</code>');           // `code` to <code>
                
                checkboxesHtml += `
                  <div class="usa-checkbox margin-bottom-1">
                    <input class="usa-checkbox__input review-checkbox" type="checkbox" id="review_q_${questionIndex}" data-index="${questionIndex}" />
                    <label class="usa-checkbox__label" for="review_q_${questionIndex}" style="font-weight:normal;">${lineText}</label>
                  </div>
                `;
                questionIndex++;
              } else if (line.trim()) {
                // Section headers or other text - display as-is, also strip markdown
                let displayText = line
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/`(.*?)`/g, '<code>$1</code>');
                checkboxesHtml += `<div style="margin-bottom:0.5rem;${line.match(/^\d+\./) ? 'font-weight:bold;margin-top:1rem;' : ''}">${displayText}</div>`;
              }
            });
            
            document.querySelector('#reviewQuestionsSection').innerHTML = `
              <div class="card margin-bottom-2" style="background:#f9f9f9;padding:1.5rem;">
                <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:bold;">Review each question as you address it:</span>
                  <span id="reviewProgress" style="color:#005ea2;font-weight:bold;">0 / ${questionIndex} reviewed</span>
                </div>
                ${checkboxesHtml}
              </div>
            `;
            
            // Add event listeners to checkboxes
            document.querySelectorAll('.review-checkbox').forEach(checkbox => {
              checkbox.addEventListener('change', (e) => {
                const index = e.target.dataset.index;
                setAnswer("soo_output", `review_q_${index}`, e.target.checked);
                updateReviewProgress();
              });
            });
            
            // Update progress counter
            const updateReviewProgress = () => {
              const total = document.querySelectorAll('.review-checkbox').length;
              const checked = document.querySelectorAll('.review-checkbox:checked').length;
              const progress = document.querySelector('#reviewProgress');
              if (progress) {
                progress.textContent = `${checked} / ${total} reviewed`;
                if (checked === total) {
                  progress.style.color = '#00a91c';
                  progress.textContent = `✓ ${checked} / ${total} reviewed`;
                }
              }
            };
            
            updateReviewProgress();
            
            reviewStatus.innerHTML = `
              <div class="usa-alert usa-alert--success">
                <div class="usa-alert__body">
                  <p>✓ Review questions generated! Check each box as you address the question in your SOO draft below.</p>
                </div>
              </div>
            `;
            state.audit.events.push({
              timestamp: new Date().toISOString(),
              event: "review_questions_generated",
              questionsLength: questions.length,
              questionCount: questionIndex
            });
          }
        } catch (e) {
          reviewStatus.innerHTML = `
            <div class="usa-alert usa-alert--error">
              <div class="usa-alert__body">
                <h3 class="usa-alert__heading">AI generation failed</h3>
                <p>${escapeHtml(e.message || "Unknown error")}</p>
                <p>Use "Copy Review Prompt" to get questions from an external AI tool.</p>
              </div>
            </div>
          `;
          state.audit.events.push({
            timestamp: new Date().toISOString(),
            event: "review_questions_failed",
            error: e.message
          });
        } finally {
          generateReviewBtn.disabled = false;
        }
      });
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

  // If generate step, show prompt and draft management
  if (step.id === "generate" && fields) {
    // Build the prompt
    const inputs = {
      vision: getAnswer("vision", "vision", ""),
      target_group: getAnswer("vision", "target_group", ""),
      needs: getAnswer("vision", "needs", ""),
      product: getAnswer("vision", "product", ""),
      business_goals: getAnswer("vision", "business_goals", ""),
      po_agile_training: getAnswer("readiness_assessment", "po_agile_training", ""),
      target_customer: getAnswer("positioning_statement", "target_customer", ""),
      customer_need: getAnswer("positioning_statement", "customer_need", ""),
      product_name: getAnswer("positioning_statement", "product_name", ""),
      product_category: getAnswer("positioning_statement", "product_category", ""),
      key_benefit: getAnswer("positioning_statement", "key_benefit", ""),
      alternative: getAnswer("positioning_statement", "alternative", ""),
      differentiation: getAnswer("positioning_statement", "differentiation", ""),
      end_user_access: getAnswer("readiness_assessment", "end_user_access", ""),
      approvals_cycle: getAnswer("readiness_assessment", "approvals_cycle", ""),
      context: getAnswer("methodology", "context", "new_dev"),
      budget_range: getAnswer("methodology", "budget_range", ""),
      background: getAnswer("methodology", "background", ""),
      outcome_definition: getAnswer("methodology", "outcome_definition", ""),
      outcome_evidence: getAnswer("methodology", "outcome_evidence", ""),
      outcome_governance: getAnswer("methodology", "outcome_governance", ""),
      problem_context: getAnswer("soo_inputs", "problem_context", ""),
      objectives: getAnswer("soo_inputs", "objectives", ""),
      constraints: getAnswer("soo_inputs", "constraints", ""),
      regulations: getAnswer("soo_inputs", "regulations", ""),
      tech_stack: getAnswer("soo_inputs", "tech_stack", ""),
      success: getAnswer("soo_inputs", "success", "")
    };

    const contextLabelMap = {
      new_dev: "New development",
      legacy_maint: "Maintenance of legacy system",
      ops_support: "Operations and support",
      discovery: "Discovery or research",
      migration: "Migration"
    };
    inputs.context_label = contextLabelMap[inputs.context] || inputs.context;

    const promptDoc = state.prompts.soo;
    const prompt = renderTemplate(promptDoc.template, inputs);
    const draft = getAnswer("soo_output", "soo_draft", "");
    
    fields.innerHTML = `
      <div class="margin-bottom-3">
        <label for="soo_prompt" class="usa-label">SOO Prompt (editable)</label>
        <div class="usa-hint">Edit the prompt if needed, then click "Generate with AI" or copy it to use externally.</div>
        <textarea id="soo_prompt" class="usa-textarea large-textarea mono" rows="10" style="font-size:13px;">${escapeHtml(prompt)}</textarea>
        <div class="margin-top-2 display-flex flex-justify">
          <button class="usa-button usa-button--outline" id="copyPrompt">Copy Prompt</button>
          <button class="usa-button" id="generateBtn">Generate with AI</button>
        </div>
      </div>
      
      <div id="aiStatus" class="margin-bottom-3"></div>
      
      <div class="margin-bottom-2">
        <label for="soo_draft" class="usa-label">SOO Markdown (editable)</label>
        <div class="usa-hint">The AI-generated or manually entered SOO draft. Edit as needed.</div>
        <textarea id="soo_draft" class="usa-textarea large-textarea" style="font-family:monospace;font-size:14px;">${escapeHtml(draft)}</textarea>
        <div class="margin-top-2">
          <button class="usa-button usa-button--secondary" id="regenerateBtn">Regenerate with AI</button>
        </div>
      </div>
    `;
    
    const promptField = fields.querySelector('#soo_prompt');
    const draftField = fields.querySelector('#soo_draft');
    const aiStatus = fields.querySelector('#aiStatus');
    const copyBtn = fields.querySelector('#copyPrompt');
    const generateBtn = fields.querySelector('#generateBtn');
    const regenerateBtn = fields.querySelector('#regenerateBtn');

    if (!isAiEnabled()) {
      generateBtn.style.display = 'none';
      regenerateBtn.style.display = 'none';
      aiStatus.innerHTML = `
        <div class="usa-alert usa-alert--info">
          <div class="usa-alert__body">
            <p>AI endpoint is not configured. This session is running as a Prompt Wizard. Copy the prompt and use your own AI tool.</p>
          </div>
        </div>
      `;
    }
    
    // Save draft changes
    draftField.addEventListener('input', e => {
      setAnswer("soo_output", "soo_draft", e.target.value);
    });
    
    // Copy prompt to clipboard
    copyBtn.addEventListener('click', () => {
      promptField.select();
      document.execCommand("copy");
      aiStatus.innerHTML = '<div class="usa-alert usa-alert--success"><div class="usa-alert__body"><p>Prompt copied to clipboard!</p></div></div>';
      setTimeout(() => { aiStatus.innerHTML = ''; }, 3000);
    });
    
    // Generate with AI function
    const generateWithAI = async () => {
      const endpoint = aiConfig.aiEndpoint?.trim();
      const model = aiConfig.model?.trim();
      const timeout = aiConfig.timeout * 1000;
      const currentPrompt = promptField.value;
      
      if (!endpoint) {
        aiStatus.innerHTML = `
          <div class="usa-alert usa-alert--warning">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">No AI endpoint configured</h3>
              <p>Take this prompt and put it into the AI of your choice. When you are satisfied with the response, put it into the SOO Markdown field above.</p>
            </div>
          </div>
        `;
        return;
      }
      
      // Show generating status
      aiStatus.innerHTML = `
        <div class="usa-alert usa-alert--info">
          <div class="usa-alert__body">
            <p><strong>AI Generation of Draft... Please Wait</strong></p>
            <p>Calling ${escapeHtml(endpoint)} with model ${escapeHtml(model)}...</p>
          </div>
        </div>
      `;
      generateBtn.disabled = true;
      regenerateBtn.disabled = true;
      
      try {
        const base = endpoint.replace(/\/$/, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const r = await fetch(`${base}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: currentPrompt, stream: false }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          const err = await r.text();
          throw new Error(`AI error ${r.status}: ${err}`);
        }
        
        const data = await r.json();
        const text = data?.response || "";
        
        if (text) {
          draftField.value = text;
          setAnswer("soo_output", "soo_draft", text);
          aiStatus.innerHTML = `
            <div class="usa-alert usa-alert--success">
              <div class="usa-alert__body">
                <p>✓ AI generation complete! Review the draft below and edit as needed.</p>
              </div>
            </div>
          `;
          state.audit.events.push({
            timestamp: new Date().toISOString(),
            event: "ai_generation_success",
            endpoint,
            model,
            textLength: text.length
          });
        }
      } catch (e) {
        aiStatus.innerHTML = `
          <div class="usa-alert usa-alert--error">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">AI generation failed</h3>
              <p>${escapeHtml(e.message || "Unknown error")}</p>
              <p>Take the prompt above and put it into the AI of your choice. When you are satisfied with the response, paste it into the SOO Markdown field.</p>
            </div>
          </div>
        `;
        state.audit.events.push({
          timestamp: new Date().toISOString(),
          event: "ai_generation_failed",
          error: e.message
        });
      } finally {
        generateBtn.disabled = false;
        regenerateBtn.disabled = false;
      }
    };
    
    generateBtn.addEventListener('click', generateWithAI);
    regenerateBtn.addEventListener('click', generateWithAI);
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
  // Listen for hash changes to support direct navigation to steps
  window.addEventListener('hashchange', () => {
    if (!state.flow || !state.flow.steps) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const idx = state.flow.steps.findIndex(s => s.id === hash);
    if (idx >= 0 && idx !== state.stepIndex) {
      state.stepIndex = idx;
      render();
    }
  });

  // On initial load, jump to step if hash is present
  window.addEventListener('DOMContentLoaded', () => {
    if (!state.flow || !state.flow.steps) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const idx = state.flow.steps.findIndex(s => s.id === hash);
    if (idx >= 0 && idx !== state.stepIndex) {
      state.stepIndex = idx;
      render();
    }
  });
  }

  // Update next button text and check lint after DOM is ready
  const nextBtn = app.querySelector("#next");
  const messages = app.querySelector("#messages");
  
  if (nextBtn) {
    // Set button text
    nextBtn.textContent = step.id === "export_center" ? "Export" : step.id === "soo_output" ? "Accept & Continue" : "Next";
    
    // Function to check lint and update UI
    const checkLintAndUpdateUI = () => {
      if (step.gateLint && step.id !== "generate") {
        const lint = lintStep(step);
        if (lint.summary.hasErrors) {
          nextBtn.disabled = true;
          if (messages) {
            messages.innerHTML = "";
            const alertElement = renderLintAlert(lint, step.id);
            messages.appendChild(alertElement);
            attachLintRewriteHandler(alertElement, step, nextBtn, messages, checkLintAndUpdateUI);
          }
        } else {
          nextBtn.disabled = false;
          if (messages) {
            messages.innerHTML = "";
          }
        }
      }
    };
    
    // Initial lint check
    checkLintAndUpdateUI();
    
    // Add real-time lint checking to all form fields
    if (step.gateLint && step.id !== "generate") {
      const fieldElements = app.querySelectorAll('#fields textarea, #fields input');
      fieldElements.forEach(fieldElement => {
        fieldElement.addEventListener('input', () => {
          // Small delay to avoid excessive checking while typing
          clearTimeout(fieldElement.lintTimeout);
          fieldElement.lintTimeout = setTimeout(checkLintAndUpdateUI, 500);
        });
      });
    }
    
    nextBtn.addEventListener("click", async () => {
      if (!messages) return;
      messages.innerHTML = "";

      // Gate: Readiness confirmation (Step 3)
      if (step.id === "readiness_results") {
        const summaryVal = (getAnswer("readiness_results", "readiness_summary", "") || "").trim();
        const confirmed = !!getAnswer("readiness_results", "readiness_confirm", false);
        if (!confirmed) {
          messages.appendChild(el(`
            <div class="usa-alert usa-alert--error">
              <div class="usa-alert__body">
                <h3 class="usa-alert__heading">Please confirm your readiness review</h3>
                <p>Check "I have reviewed and understand my readiness assessment" to continue.</p>
              </div>
            </div>
          `));
          return;
        }
        if (!summaryVal) {
          messages.appendChild(el(`
            <div class="usa-alert usa-alert--error">
              <div class="usa-alert__body">
                <h3 class="usa-alert__heading">Add a readiness summary</h3>
                <p>Please provide or accept the readiness summary before continuing.</p>
              </div>
            </div>
          `));
          return;
        }
      }

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
      
      // Log lint results to audit
      state.audit.lintResults[step.id] = {
        timestamp: new Date().toISOString(),
        stepId: step.id,
        stepTitle: step.title,
        hasErrors: lint.summary.hasErrors,
        errorCount: lint.summary.errorCount,
        warnCount: lint.summary.warnCount,
        findings: lint.findings.map(f => ({
          severity: f.severity,
          ruleId: f.id,
          message: f.message,
          match: f.match
        }))
      };
      
      if (lint.summary.hasErrors) {
        console.log("Lint errors found:", lint.findings);
        const alertElement = renderLintAlert(lint, step.id);
        console.log("Adding lint alert to messages div:", alertElement);
        messages.appendChild(alertElement);
        attachLintRewriteHandler(alertElement, step, nextBtn, messages, () => {
          // re-run lint and update button state after rewrite
          const newLint = lintStep(step);
          if (newLint.summary.hasErrors) {
            nextBtn.disabled = true;
          } else {
            nextBtn.disabled = false;
            messages.innerHTML = "";
          }
        });
        return;
      }
    }

    // Step 8 (generate) - just validate that draft exists before proceeding
    if (step.id === "generate") {
      const draft = getAnswer("soo_output", "soo_draft", "").trim();
      if (!draft) {
        messages.appendChild(el(`
          <div class="usa-alert usa-alert--warning">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">No SOO draft yet</h3>
              <p>Please generate a draft using AI or paste one manually before proceeding.</p>
            </div>
          </div>
        `));
        return;
      }
      
      // Lint the draft and capture results
      const draftLint = lintText(draft);
      state.audit.lintResults['soo_draft'] = {
        timestamp: new Date().toISOString(),
        stepId: 'generate',
        documentType: 'soo_draft',
        hasErrors: draftLint.summary.hasErrors,
        errorCount: draftLint.summary.errorCount,
        warnCount: draftLint.summary.warnCount,
        findings: draftLint.findings.map(f => ({
          severity: f.severity,
          ruleId: f.id,
          message: f.message,
          match: f.match
        }))
      };
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
      
      // Finalize audit metadata
      state.audit.metadata.sessionEnd = new Date().toISOString();
      state.audit.metadata.totalStepsCompleted = state.audit.stepCompletions.length;
      state.audit.metadata.aiCallsAttempted = state.audit.events.filter(e => e.event.includes('generation')).length;
      state.audit.metadata.aiCallsSuccessful = state.audit.events.filter(e => e.event.includes('success')).length;
      
      const auditJson = JSON.stringify(state.audit, null, 2);
      
      // Build prompts.txt with actual values substituted
      const buildPromptsFile = () => {
        const inputs = {
          vision: getAnswer("vision", "vision", ""),
          target_group: getAnswer("vision", "target_group", ""),
          needs: getAnswer("vision", "needs", ""),
          product: getAnswer("vision", "product", ""),
          business_goals: getAnswer("vision", "business_goals", ""),
          target_customer: getAnswer("positioning_statement", "target_customer", ""),
          customer_need: getAnswer("positioning_statement", "customer_need", ""),
          product_name: getAnswer("positioning_statement", "product_name", ""),
          product_category: getAnswer("positioning_statement", "product_category", ""),
          key_benefit: getAnswer("positioning_statement", "key_benefit", ""),
          alternative: getAnswer("positioning_statement", "alternative", ""),
          differentiation: getAnswer("positioning_statement", "differentiation", ""),
          has_po: getAnswer("readiness_assessment", "has_po", ""),
          end_user_access: getAnswer("readiness_assessment", "end_user_access", ""),
          approvals_cycle: getAnswer("readiness_assessment", "approvals_cycle", ""),
          context: getAnswer("methodology", "context", "new_dev"),
          problem_context: getAnswer("soo_inputs", "problem_context", ""),
          objectives: getAnswer("soo_inputs", "objectives", ""),
          constraints: getAnswer("soo_inputs", "constraints", ""),
          soo_draft: sooMd
        };
        
        const sections = [];
        
        if (state.prompts.soo?.template) {
          sections.push("# SOO Generation Prompt\n\n" + renderTemplate(state.prompts.soo.template, inputs));
        }
        
        if (state.prompts.pws?.template) {
          sections.push("# PWS Request Pack Generation Prompt\n\n" + renderTemplate(state.prompts.pws.template, inputs));
        }
        
        if (state.prompts.rewrite?.template) {
          sections.push("# SOO Rewrite Prompt\n\n" + renderTemplate(state.prompts.rewrite.template, inputs));
        }
        
        return sections.join('\n\n---\n\n');
      };
      
      const promptsTxt = buildPromptsFile();
      function markdownToHtml(md) {
        const lines = md.split('\n');
        let html = '';
        let inTable = false;
        let tableRows = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Detect table rows (contain | characters)
          if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) {
              inTable = true;
              tableRows = [];
            }
            // Skip separator rows (|---|---|)
            if (!line.match(/^\|\s*[-:]+\s*\|/)) {
              tableRows.push(line);
            }
          } else {
            // End of table - render it
            if (inTable && tableRows.length > 0) {
              html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
              tableRows.forEach((row, rowIdx) => {
                const cells = row.split('|').filter(c => c.trim());
                const tag = rowIdx === 0 ? 'th' : 'td';
                html += '<tr>';
                cells.forEach(cell => {
                  let cellContent = cell.trim()
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.*?)\*/g, '<i>$1</i>');
                  html += `<${tag}>${cellContent}</${tag}>`;
                });
                html += '</tr>\n';
              });
              html += '</table>\n';
              inTable = false;
              tableRows = [];
            }
            
            // Process regular lines
            if (line.startsWith('# ')) {
              html += '<h1>' + line.substring(2) + '</h1>\n';
            } else if (line.startsWith('## ')) {
              html += '<h2>' + line.substring(3) + '</h2>\n';
            } else if (line.startsWith('### ')) {
              html += '<h3>' + line.substring(4) + '</h3>\n';
            } else if (line.match(/^\s*[-*]\s+/)) {
              html += '<li>' + line.replace(/^\s*[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</li>\n';
            } else if (line.trim()) {
              html += '<p>' + line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</p>\n';
            } else {
              html += '<br>\n';
            }
          }
        }
        
        // Handle table at end of document
        if (inTable && tableRows.length > 0) {
          html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
          tableRows.forEach((row, rowIdx) => {
            const cells = row.split('|').filter(c => c.trim());
            const tag = rowIdx === 0 ? 'th' : 'td';
            html += '<tr>';
            cells.forEach(cell => {
              let cellContent = cell.trim()
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>');
              html += `<${tag}>${cellContent}</${tag}>`;
            });
            html += '</tr>\n';
          });
          html += '</table>\n';
        }
        
        // Wrap list items in <ul> tags
        html = html.replace(/(<li>.*?<\/li>\n)+/gs, '<ul>$&</ul>\n');
        
        return `<html><head><meta charset="UTF-8"><title>SOO Document</title></head><body>${html}</body></html>`;
      }
      function markdownToRtf(md) {
        // RTF requires ASCII encoding - convert special characters
        function escapeRtf(text) {
          return text
            // Common Unicode replacements
            .replace(/'/g, "'")  // Smart single quotes
            .replace(/'/g, "'")
            .replace(/"/g, '"')  // Smart double quotes
            .replace(/"/g, '"')
            .replace(/—/g, '--') // Em dash
            .replace(/–/g, '-')  // En dash
            .replace(/…/g, '...') // Ellipsis
            .replace(/£/g, 'GBP') // Pound
            .replace(/€/g, 'EUR') // Euro
            .replace(/©/g, '(c)') // Copyright
            .replace(/®/g, '(R)') // Registered
            .replace(/™/g, '(TM)') // Trademark
            .replace(/°/g, ' degrees') // Degree
            .replace(/±/g, '+/-') // Plus-minus
            .replace(/×/g, 'x')   // Multiplication
            .replace(/÷/g, '/')   // Division
            .replace(/≤/g, '<=')  // Less than or equal
            .replace(/≥/g, '>=')  // Greater than or equal
            .replace(/≠/g, '!=')  // Not equal
            .replace(/²/g, '2')   // Superscript 2
            .replace(/³/g, '3')   // Superscript 3
            .replace(/₂/g, '2')   // Subscript 2 (CO2)
            .replace(/\u00A0/g, ' ') // Non-breaking space
            // Remove any remaining non-ASCII characters
            .replace(/[^\x00-\x7F]/g, '');
        }
        
        let rtf = '{\\rtf1\\ansi\\deff0\n';
        rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\n';
        const lines = md.split('\n');
        let inTable = false;
        let tableRows = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) {
              inTable = true;
              tableRows = [];
            }
            if (!line.match(/^\|\s*[-:]+\s*\|/)) {
              tableRows.push(line);
            }
          } else {
            if (inTable && tableRows.length > 0) {
              const cols = tableRows[0].split('|').filter(c => c.trim()).length;
              const colWidth = Math.floor(9000 / cols);
              tableRows.forEach((row, rowIdx) => {
                const cells = row.split('|').filter(c => c.trim());
                rtf += '\\trowd\\trgaph108\\trleft-108';
                for (let c = 0; c < cells.length; c++) {
                  rtf += `\\cellx${(c + 1) * colWidth}`;
                }
                rtf += '\n';
                cells.forEach(cell => {
                  const cleanCell = escapeRtf(cell.trim()).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0');
                  if (rowIdx === 0) {
                    rtf += '\\pard\\intbl\\b ' + cleanCell + '\\b0\\cell\n';
                  } else {
                    rtf += '\\pard\\intbl ' + cleanCell + '\\cell\n';
                  }
                });
                rtf += '\\row\n';
              });
              rtf += '\\pard\\par\n';
              inTable = false;
              tableRows = [];
            }
            if (line.startsWith('# ')) {
              rtf += '\\pard\\fs32\\b ' + escapeRtf(line.substring(2).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
            } else if (line.startsWith('## ')) {
              rtf += '\\pard\\fs28\\b ' + escapeRtf(line.substring(3).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
            } else if (line.startsWith('### ')) {
              rtf += '\\pard\\fs26\\b ' + escapeRtf(line.substring(4).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
            } else if (line.match(/^[-*]\s+/)) {
              rtf += '\\pard\\fi-360\\li720 \\bullet ' + escapeRtf(line.replace(/^[-*]\s+/, '')).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0') + '\\par\n';
            } else if (line.trim()) {
              rtf += '\\pard ' + escapeRtf(line).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0') + '\\par\n';
            } else {
              rtf += '\\par\n';
            }
          }
        }
        if (inTable && tableRows.length > 0) {
          const cols = tableRows[0].split('|').filter(c => c.trim()).length;
          const colWidth = Math.floor(9000 / cols);
          tableRows.forEach((row, rowIdx) => {
            const cells = row.split('|').filter(c => c.trim());
            rtf += '\\trowd\\trgaph108\\trleft-108';
            for (let c = 0; c < cells.length; c++) {
              rtf += `\\cellx${(c + 1) * colWidth}`;
            }
            rtf += '\n';
            cells.forEach(cell => {
              const cleanCell = escapeRtf(cell.trim()).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0');
              if (rowIdx === 0) {
                rtf += '\\pard\\intbl\\b ' + cleanCell + '\\b0\\cell\n';
              } else {
                rtf += '\\pard\\intbl ' + cleanCell + '\\cell\n';
              }
            });
            rtf += '\\row\n';
          });
        }
        rtf += '}';
        return rtf;
      }
      const files = {
        "soo.md": sooMd,
        "soo.html": markdownToHtml(sooMd),
        "soo.rtf": markdownToRtf(sooMd),
        "pws_request_pack.md": pwsMd,
        "pws_request_pack.html": markdownToHtml(pwsMd),
        "pws_request_pack.rtf": markdownToRtf(pwsMd),
        "source/inputs.yml": buildInputsYml(),
        "source/audit.json": auditJson,
        "source/prompts.txt": promptsTxt
      };
      // Generate filename with product name and timestamp
      const productName = getAnswer("positioning_statement", "product_name", "") || getAnswer("vision", "product", "") || "SOO";
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

    // Log step completion
    state.audit.stepCompletions.push({
      timestamp: new Date().toISOString(),
      stepId: step.id,
      stepTitle: step.title,
      stepNumber: state.stepIndex + 1
    });
    
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
    const lines = md.split('\n');
    let html = '';
    let inTable = false;
    let tableRows = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect table rows (contain | characters)
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        // Skip separator rows (|---|---|)
        if (!line.match(/^\|\s*[-:]+\s*\|/)) {
          tableRows.push(line);
        }
      } else {
        // End of table - render it
        if (inTable && tableRows.length > 0) {
          html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
          tableRows.forEach((row, rowIdx) => {
            const cells = row.split('|').filter(c => c.trim());
            const tag = rowIdx === 0 ? 'th' : 'td';
            html += '<tr>';
            cells.forEach(cell => {
              let cellContent = cell.trim()
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>');
              html += `<${tag}>${cellContent}</${tag}>`;
            });
            html += '</tr>\n';
          });
          html += '</table>\n';
          inTable = false;
          tableRows = [];
        }
        
        // Process regular lines
        if (line.startsWith('# ')) {
          html += '<h1>' + line.substring(2) + '</h1>\n';
        } else if (line.startsWith('## ')) {
          html += '<h2>' + line.substring(3) + '</h2>\n';
        } else if (line.startsWith('### ')) {
          html += '<h3>' + line.substring(4) + '</h3>\n';
        } else if (line.match(/^\s*[-*]\s+/)) {
          html += '<li>' + line.replace(/^\s*[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</li>\n';
        } else if (line.trim()) {
          html += '<p>' + line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</p>\n';
        } else {
          html += '<br>\n';
        }
      }
    }
    
    // Handle table at end of document
    if (inTable && tableRows.length > 0) {
      html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
      tableRows.forEach((row, rowIdx) => {
        const cells = row.split('|').filter(c => c.trim());
        const tag = rowIdx === 0 ? 'th' : 'td';
        html += '<tr>';
        cells.forEach(cell => {
          let cellContent = cell.trim()
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>');
          html += `<${tag}>${cellContent}</${tag}>`;
        });
        html += '</tr>\n';
      });
      html += '</table>\n';
    }
    
    // Wrap list items in <ul> tags
    html = html.replace(/(<li>.*?<\/li>\n)+/gs, '<ul>$&</ul>\n');
    
    return `<html><head><meta charset="UTF-8"><title>SOO Document</title></head><body>${html}</body></html>`;
  }
  function markdownToRtf(md) {
    // RTF requires ASCII encoding - convert special characters
    function escapeRtf(text) {
      return text
        // Common Unicode replacements
        .replace(/'/g, "'")  // Smart single quotes
        .replace(/'/g, "'")
        .replace(/"/g, '"')  // Smart double quotes
        .replace(/"/g, '"')
        .replace(/—/g, '--') // Em dash
        .replace(/–/g, '-')  // En dash
        .replace(/…/g, '...') // Ellipsis
        .replace(/£/g, 'GBP') // Pound
        .replace(/€/g, 'EUR') // Euro
        .replace(/©/g, '(c)') // Copyright
        .replace(/®/g, '(R)') // Registered
        .replace(/™/g, '(TM)') // Trademark
        .replace(/°/g, ' degrees') // Degree
        .replace(/±/g, '+/-') // Plus-minus
        .replace(/×/g, 'x')   // Multiplication
        .replace(/÷/g, '/')   // Division
        .replace(/≤/g, '<=')  // Less than or equal
        .replace(/≥/g, '>=')  // Greater than or equal
        .replace(/≠/g, '!=')  // Not equal
        .replace(/²/g, '2')   // Superscript 2
        .replace(/³/g, '3')   // Superscript 3
        .replace(/₂/g, '2')   // Subscript 2 (CO2)
        .replace(/\u00A0/g, ' ') // Non-breaking space
        // Remove any remaining non-ASCII characters
        .replace(/[^\x00-\x7F]/g, '');
    }
    
    // RTF header
    let rtf = '{\\rtf1\\ansi\\deff0\n';
    rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\n';
    
    const lines = md.split('\n');
    let inTable = false;
    let tableRows = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect table rows (contain | characters)
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        // Skip separator rows (|---|---|)
        if (!line.match(/^\|\s*[-:]+\s*\|/)) {
          tableRows.push(line);
        }
      } else {
        // End of table - render it
        if (inTable && tableRows.length > 0) {
          const cols = tableRows[0].split('|').filter(c => c.trim()).length;
          const colWidth = Math.floor(9000 / cols); // Distribute width evenly
          
          tableRows.forEach((row, rowIdx) => {
            const cells = row.split('|').filter(c => c.trim());
            rtf += '\\trowd\\trgaph108\\trleft-108';
            // Define column widths
            for (let c = 0; c < cells.length; c++) {
              rtf += `\\cellx${(c + 1) * colWidth}`;
            }
            rtf += '\n';
            // Add cells
            cells.forEach(cell => {
              const cleanCell = escapeRtf(cell.trim()).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0');
              if (rowIdx === 0) {
                // Header row - bold
                rtf += '\\pard\\intbl\\b ' + cleanCell + '\\b0\\cell\n';
              } else {
                rtf += '\\pard\\intbl ' + cleanCell + '\\cell\n';
              }
            });
            rtf += '\\row\n';
          });
          rtf += '\\pard\\par\n'; // Space after table
          
          inTable = false;
          tableRows = [];
        }
        
        // Process regular lines
        if (line.startsWith('# ')) {
          rtf += '\\pard\\fs32\\b ' + escapeRtf(line.substring(2).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
        } else if (line.startsWith('## ')) {
          rtf += '\\pard\\fs28\\b ' + escapeRtf(line.substring(3).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
        } else if (line.startsWith('### ')) {
          rtf += '\\pard\\fs26\\b ' + escapeRtf(line.substring(4).replace(/\*\*/g, '')) + '\\b0\\fs24\\par\n';
        } else if (line.match(/^[-*]\s+/)) {
          rtf += '\\pard\\fi-360\\li720 \\bullet ' + escapeRtf(line.replace(/^[-*]\s+/, '')).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0') + '\\par\n';
        } else if (line.trim()) {
          rtf += '\\pard ' + escapeRtf(line).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0') + '\\par\n';
        } else {
          rtf += '\\par\n';
        }
      }
    }
    
    // Handle table at end of document
    if (inTable && tableRows.length > 0) {
      const cols = tableRows[0].split('|').filter(c => c.trim()).length;
      const colWidth = Math.floor(9000 / cols);
      
      tableRows.forEach((row, rowIdx) => {
        const cells = row.split('|').filter(c => c.trim());
        rtf += '\\trowd\\trgaph108\\trleft-108';
        for (let c = 0; c < cells.length; c++) {
          rtf += `\\cellx${(c + 1) * colWidth}`;
        }
        rtf += '\n';
        cells.forEach(cell => {
          const cleanCell = escapeRtf(cell.trim()).replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0').replace(/\*(.*?)\*/g, '\\i $1\\i0');
          if (rowIdx === 0) {
            rtf += '\\pard\\intbl\\b ' + cleanCell + '\\b0\\cell\n';
          } else {
            rtf += '\\pard\\intbl ' + cleanCell + '\\cell\n';
          }
        });
        rtf += '\\row\n';
      });
    }
    
    rtf += '}';
    return rtf;
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
      // Finalize audit metadata before export
      state.audit.metadata.sessionEnd = new Date().toISOString();
      state.audit.metadata.totalStepsCompleted = state.audit.stepCompletions.length;
      state.audit.metadata.aiCallsAttempted = state.audit.events.filter(e => e.event.includes('generation')).length;
      state.audit.metadata.aiCallsSuccessful = state.audit.events.filter(e => e.event.includes('success')).length;
      
      const updatedAuditJson = JSON.stringify(state.audit, null, 2);
      
      // Build prompts.txt with actual values substituted
      const buildPromptsFileForAccordion = () => {
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
          has_po: getAnswer("readiness_assessment", "has_po", ""),
          end_user_access: getAnswer("readiness_assessment", "end_user_access", ""),
          approvals_cycle: getAnswer("readiness_assessment", "approvals_cycle", ""),
          context: getAnswer("methodology", "context", "new_dev"),
          problem_context: getAnswer("soo_inputs", "problem_context", ""),
          objectives: getAnswer("soo_inputs", "objectives", ""),
          constraints: getAnswer("soo_inputs", "constraints", ""),
          soo_draft: sooMd
        };
        
        const sections = [];
        
        if (state.prompts.soo?.template) {
          sections.push("# SOO Generation Prompt\n\n" + renderTemplate(state.prompts.soo.template, inputs));
        }
        
        if (state.prompts.pws?.template) {
          sections.push("# PWS Request Pack Generation Prompt\n\n" + renderTemplate(state.prompts.pws.template, inputs));
        }
        
        if (state.prompts.rewrite?.template) {
          sections.push("# SOO Rewrite Prompt\n\n" + renderTemplate(state.prompts.rewrite.template, inputs));
        }
        
        return sections.join('\n\n---\n\n');
      };
      
      const updatedPromptsTxt = buildPromptsFileForAccordion();
      
      const files = {
        "soo.md": sooMd,
        "soo.html": markdownToHtml(sooMd),
        "soo.rtf": markdownToRtf(sooMd),
        "pws_request_pack.md": pwsMd,
        "pws_request_pack.html": markdownToHtml(pwsMd),
        "pws_request_pack.rtf": markdownToRtf(pwsMd),
        "source/inputs.yml": buildInputsYml(),
        "source/audit.json": updatedAuditJson,
        "source/prompts.txt": updatedPromptsTxt
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
      // Build prompts.txt with actual values substituted
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
        has_po: getAnswer("readiness_assessment", "has_po", ""),
        end_user_access: getAnswer("readiness_assessment", "end_user_access", ""),
        approvals_cycle: getAnswer("readiness_assessment", "approvals_cycle", ""),
        context: getAnswer("methodology", "context", "new_dev"),
        problem_context: getAnswer("soo_inputs", "problem_context", ""),
        objectives: getAnswer("soo_inputs", "objectives", ""),
        constraints: getAnswer("soo_inputs", "constraints", ""),
        soo_draft: getAnswer("soo_output", "soo_draft", "")
      };
      
      const sections = [];
      
      if (state.prompts.soo?.template) {
        sections.push("# SOO Generation Prompt\n\n" + renderTemplate(state.prompts.soo.template, inputs));
      }
      
      if (state.prompts.pws?.template) {
        sections.push("# PWS Request Pack Generation Prompt\n\n" + renderTemplate(state.prompts.pws.template, inputs));
      }
      
      if (state.prompts.rewrite?.template) {
        sections.push("# SOO Rewrite Prompt\n\n" + renderTemplate(state.prompts.rewrite.template, inputs));
      }
      
      const promptsTxt = sections.join('\n\n---\n\n');
      downloadText('prompts.txt', promptsTxt);
    });
  }
  
  // Import inputs.yml
  const importInputsBtn = app.querySelector('#importInputs');
  if (importInputsBtn) {
    importInputsBtn.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const yamlText = event.target.result;
        const result = importInputsYml(yamlText);
        
        // Show alert with result
        const alertDiv = document.createElement('div');
        alertDiv.className = result.success ? 'usa-alert usa-alert--success margin-top-2' : 'usa-alert usa-alert--error margin-top-2';
        alertDiv.innerHTML = `
          <div class="usa-alert__body">
            <p class="usa-alert__text">${result.message}</p>
          </div>
        `;
        
        const accordion = app.querySelector('#exportAccordionContent');
        if (accordion) {
          accordion.insertBefore(alertDiv, accordion.firstChild);
          setTimeout(() => alertDiv.remove(), 5000);
        }
        
        // Reset the file input so the same file can be uploaded again
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }
  
  // Import inputs.yml from Step 1
  const importInputsStep1Btn = app.querySelector('#importInputsStep1');
  if (importInputsStep1Btn) {
    importInputsStep1Btn.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const yamlText = event.target.result;
        const result = importInputsYml(yamlText);
        
        // Show alert with result
        const alertDiv = document.createElement('div');
        alertDiv.className = result.success ? 'usa-alert usa-alert--success margin-top-2' : 'usa-alert usa-alert--error margin-top-2';
        alertDiv.innerHTML = `
          <div class="usa-alert__body">
            <p class="usa-alert__text">${result.message}</p>
          </div>
        `;
        
        // Find the import section and add alert
        const importSection = app.querySelector('#importInputsStep1').closest('.usa-alert');
        if (importSection) {
          importSection.appendChild(alertDiv);
          setTimeout(() => alertDiv.remove(), 5000);
        }
        
        // Reset the file input
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Export Center: add HTML to ZIP
  if (step.id === "export_center") {
    // Helper: Markdown to HTML converter with table support
    function markdownToHtml(md) {
      const lines = md.split('\n');
      let html = '';
      let inTable = false;
      let tableRows = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect table rows (contain | characters)
        if (line.includes('|') && line.trim().startsWith('|')) {
          if (!inTable) {
            inTable = true;
            tableRows = [];
          }
          // Skip separator rows (|---|---|)
          if (!line.match(/^\|\s*[-:]+\s*\|/)) {
            tableRows.push(line);
          }
        } else {
          // End of table - render it
          if (inTable && tableRows.length > 0) {
            html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
            tableRows.forEach((row, rowIdx) => {
              const cells = row.split('|').filter(c => c.trim());
              const tag = rowIdx === 0 ? 'th' : 'td';
              html += '<tr>';
              cells.forEach(cell => {
                let cellContent = cell.trim()
                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  .replace(/\*(.*?)\*/g, '<i>$1</i>');
                html += `<${tag}>${cellContent}</${tag}>`;
              });
              html += '</tr>\n';
            });
            html += '</table>\n';
            inTable = false;
            tableRows = [];
          }
          
          // Process regular lines
          if (line.startsWith('# ')) {
            html += '<h1>' + line.substring(2) + '</h1>\n';
          } else if (line.startsWith('## ')) {
            html += '<h2>' + line.substring(3) + '</h2>\n';
          } else if (line.startsWith('### ')) {
            html += '<h3>' + line.substring(4) + '</h3>\n';
          } else if (line.match(/^\s*[-*]\s+/)) {
            html += '<li>' + line.replace(/^\s*[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</li>\n';
          } else if (line.trim()) {
            html += '<p>' + line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') + '</p>\n';
          } else {
            html += '<br>\n';
          }
        }
      }
      
      // Handle table at end of document
      if (inTable && tableRows.length > 0) {
        html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:1em 0;">\n';
        tableRows.forEach((row, rowIdx) => {
          const cells = row.split('|').filter(c => c.trim());
          const tag = rowIdx === 0 ? 'th' : 'td';
          html += '<tr>';
          cells.forEach(cell => {
            let cellContent = cell.trim()
              .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
              .replace(/\*(.*?)\*/g, '<i>$1</i>');
            html += `<${tag}>${cellContent}</${tag}>`;
          });
          html += '</tr>\n';
        });
        html += '</table>\n';
      }
      
      // Wrap list items in <ul> tags
      html = html.replace(/(<li>.*?<\/li>\n)+/gs, '<ul>$&</ul>\n');
      return `<html><head><meta charset="UTF-8"><title>SOO Document</title></head><body>${html}</body></html>`;
    }
    const sooMd = getAnswer("soo_output", "soo_draft", "");
    const pwsMd = getAnswer("pws_vendor_pack", "pws_pack_preview", "");
    const auditJson = JSON.stringify(state.audit, null, 2);
    const promptsTxt = [state.prompts.soo?.template, state.prompts.pws?.template, state.prompts.rewrite?.template].filter(Boolean).join('\n\n---\n\n');
    const files = {
      "soo.md": sooMd,
      "soo.html": markdownToHtml(sooMd),
      "soo.rtf": markdownToRtf(sooMd),
      "pws_request_pack.md": pwsMd,
      "pws_request_pack.html": markdownToHtml(pwsMd),
      "pws_request_pack.rtf": markdownToRtf(pwsMd),
      "source/inputs.yml": buildInputsYml(),
      "source/audit.json": auditJson,
      "source/prompts.txt": promptsTxt
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
        state.audit = { 
          metadata: {
            sessionStart: new Date().toISOString(),
            wizardVersion: "2.0"
          },
          readiness: {},
          lintResults: {},
          events: [],
          stepCompletions: []
        };
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

  if (f.type === "file") {
    const node = el(`
      <div class="margin-bottom-2">
        <label class="usa-label" for="${stepId}.${f.id}">${f.label}</label>
        ${f.hint ? `<div class="usa-hint">${f.hint}</div>` : ""}
        <input class="usa-file-input" type="file" id="${stepId}.${f.id}" ${f.accept ? `accept="${f.accept}"` : ""} style="max-width:400px;" />
        <div class="usa-hint margin-top-1" id="${stepId}.${f.id}__msg"></div>
      </div>
    `);
    const input = node.querySelector("input");
    const msg = node.querySelector(`#${CSS.escape(`${stepId}.${f.id}__msg`)}`);
    input.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        const yamlText = event.target.result;
        const result = importInputsYml(yamlText);
        if (msg) {
          msg.innerHTML = `
            <div class="usa-alert usa-alert--${result.success ? "success" : "error"} margin-top-1">
              <div class="usa-alert__body">
                <p class="usa-alert__text">${result.message}</p>
              </div>
            </div>`;
          setTimeout(() => { msg.innerHTML = ""; }, 5000);
        }
        e.target.value = ""; // reset to allow re-upload
      };
      reader.readAsText(file);
    });
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
  const textToLint = parts.join("\n");
  const lintResult = lintText(textToLint);
  console.log(`Linting step ${step.id}:`, textToLint);
  console.log(`Lint result - hasErrors: ${lintResult.summary.hasErrors}, errorCount: ${lintResult.summary.errorCount}, findings:`, lintResult.findings);
  return lintResult;
}

function renderLintAlert(lint, stepId) {
  const items = lint.findings.map(f => {
    let suggestion = "";
    const word = f.match.toLowerCase();
    
    // Provide specific suggestions based on the problematic word
    if (word === "must" || word === "shall" || word === "required") {
      suggestion = " → Try: 'will', 'can', or rephrase as an outcome";
    } else if (word === "need" || word === "need to") {
      suggestion = " → Try: 'will have', 'will receive', or describe the desired state";
    } else if (word.includes("deliver") || word.includes("build") || word.includes("develop")) {
      suggestion = " → Describe the outcome/result instead of the task";
    } else if (word === "backlog" || word === "deliverable" || word === "milestone") {
      suggestion = " → Use outcome-focused language instead of process terms";
    }
    
    return `<li><strong>${f.severity.toUpperCase()}</strong> Found "<span class='mono'>${escapeHtml(f.match)}</span>" - ${escapeHtml(f.message)}<span style='color: #0066cc;'>${suggestion}</span></li>`;
  }).join("");
  
  return el(`
    <div class="usa-alert usa-alert--error">
      <div class="usa-alert__body">
        <h3 class="usa-alert__heading">Fix these issues before continuing</h3>
        <p>SOO (Statement of Objectives) focuses on outcomes, not tasks or requirements. Please revise the highlighted words:</p>
        <ul class="usa-list">${items}</ul>
        <div class="margin-top-2">
          <button class="usa-button usa-button--outline lint-rewrite" data-step-id="${stepId || ''}">Rewrite to outcome language</button>
          <p class="usa-hint margin-top-05">This quick rewrite replaces requirement words (must/shall/required/need to) with outcome phrasing. Review the changes before continuing.</p>
        </div>
      </div>
    </div>
  `);
}

function attachLintRewriteHandler(alertElement, step, nextBtn, messages, onFinish) {
  const btn = alertElement?.querySelector(".lint-rewrite");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const changes = rewriteStepToOutcomes(step);
    const success = changes > 0;
    const lintAfter = lintStep(step);

    if (messages) {
      messages.innerHTML = "";
      if (lintAfter.summary.hasErrors) {
        const newAlert = renderLintAlert(lintAfter, step.id);
        messages.appendChild(newAlert);
        attachLintRewriteHandler(newAlert, step, nextBtn, messages, onFinish);
      } else {
        messages.appendChild(el(`
          <div class="usa-alert usa-alert--success">
            <div class="usa-alert__body">
              <h3 class="usa-alert__heading">Rewritten to outcomes</h3>
              <p>${success ? "Requirement words were replaced with outcome phrasing. Please review and adjust for accuracy." : "No changes were needed."}</p>
            </div>
          </div>
        `));
      }
    }

    if (nextBtn) nextBtn.disabled = lintAfter.summary.hasErrors;
    if (typeof onFinish === "function") onFinish();
  });
}

function rewriteStepToOutcomes(step) {
  const replacements = [
    { re: /\bmust not\b/gi, replace: "will not" },
    { re: /\bshall not\b/gi, replace: "will not" },
    { re: /\bmust\b/gi, replace: "will" },
    { re: /\bshall\b/gi, replace: "will" },
    { re: /\brequired to\b/gi, replace: "needed to" },
    { re: /\brequired\b/gi, replace: "needed" },
    { re: /\bneed to\b/gi, replace: "should" }
  ];

  let changes = 0;
  (step.fields || []).forEach(f => {
    if (!f.id) return;
    if (f.type && !["textarea", "input", undefined].includes(f.type)) return;
    const domId = `${step.id}.${f.id}`;
    const elField = document.getElementById(domId);
    const current = elField?.value ?? getAnswer(step.id, f.id, "");
    if (!current) return;
    let updated = current;
    replacements.forEach(r => {
      const next = updated.replace(r.re, r.replace);
      if (next !== updated) {
        changes++;
        updated = next;
      }
    });
    if (updated !== current) {
      setAnswer(step.id, f.id, updated);
      if (elField) elField.value = updated;
    }
  });
  return changes;
}

function buildInputsYml() {
  // Collect review question checkbox states
  const reviewQuestions = getAnswer("soo_output", "review_questions", "");
  const reviewChecklist = {};
  if (reviewQuestions) {
    const lines = reviewQuestions.split('\n');
    let questionIndex = 0;
    lines.forEach((line) => {
      // Only match lines that start with - or * (bullet points)
      if (line.match(/^\s*[-*]\s+/)) {
        const checked = getAnswer("soo_output", `review_q_${questionIndex}`, false);
        const lineText = line.replace(/^\s*[-*]\s+/, '').trim();
        reviewChecklist[`question_${questionIndex}`] = {
          text: lineText,
          reviewed: checked
        };
        questionIndex++;
      }
    });
  }
  
  const inputs = {
    version: 1,
    metadata: {
      createdAt: new Date().toISOString(),
      wizardVersion: "2.0"
    },
    readiness: {
      has_po: getAnswer("readiness_assessment", "po_agile_training", ""),
      end_user_access: getAnswer("readiness_assessment", "end_user_access", ""),
      approvals_cycle: getAnswer("readiness_assessment", "approvals_cycle", "")
    },
    product_vision_board: {
      vision: getAnswer("vision", "vision", ""),
      target_group: getAnswer("vision", "target_group", ""),
      needs: getAnswer("vision", "needs", ""),
      product: getAnswer("vision", "product", ""),
      business_goals: getAnswer("vision", "business_goals", "")
    },
    product_positioning_statement: {
      target_customer: getAnswer("positioning_statement", "target_customer", ""),
      customer_need: getAnswer("positioning_statement", "customer_need", ""),
      product_name: getAnswer("positioning_statement", "product_name", ""),
      product_category: getAnswer("positioning_statement", "product_category", ""),
      key_benefit: getAnswer("positioning_statement", "key_benefit", ""),
      alternative: getAnswer("positioning_statement", "alternative", ""),
      differentiation: getAnswer("positioning_statement", "differentiation", ""),
      moore_statement: buildMooreStatement()
    },
    methodology: {
      context: getAnswer("methodology", "context", "new_dev")
    },
    soo_inputs: {
      problem_context: getAnswer("soo_inputs", "problem_context", ""),
      objectives: getAnswer("soo_inputs", "objectives", ""),
      constraints: getAnswer("soo_inputs", "constraints", "")
    },
    soo_review: {
      review_questions: reviewQuestions,
      review_checklist: reviewChecklist,
      total_questions: Object.keys(reviewChecklist).length,
      questions_reviewed: Object.values(reviewChecklist).filter(q => q.reviewed).length
    },
    soo_output: {
      soo_draft: getAnswer("soo_output", "soo_draft", "")
    },
    pws_vendor_pack: {
      pws_pack_preview: getAnswer("pws_vendor_pack", "pws_pack_preview", "")
    }
  };

  return window.jsyaml.dump(inputs, { noRefs: true });
}

function importInputsYml(yamlText) {
  try {
    const data = window.jsyaml.load(yamlText);
    
    // Restore readiness (map legacy keys to new free-text fields)
    if (data.readiness) {
      setAnswer("readiness_assessment", "po_agile_training", data.readiness.has_po || data.readiness.po_agile_training || "");
      setAnswer("readiness_assessment", "end_user_access", data.readiness.end_user_access || "");
      setAnswer("readiness_assessment", "approvals_cycle", data.readiness.approvals_cycle || "");
    }
    
    // Restore product vision board
    if (data.product_vision_board) {
      setAnswer("vision", "vision", data.product_vision_board.vision || "");
      setAnswer("vision", "target_group", data.product_vision_board.target_group || "");
      setAnswer("vision", "needs", data.product_vision_board.needs || "");
      setAnswer("vision", "product", data.product_vision_board.product || "");
      setAnswer("vision", "business_goals", data.product_vision_board.business_goals || "");
    }
    
    // Restore Moore template
    if (data.product_positioning_statement) {
      setAnswer("positioning_statement", "target_customer", data.product_positioning_statement.target_customer || "");
      setAnswer("positioning_statement", "customer_need", data.product_positioning_statement.customer_need || "");
      setAnswer("positioning_statement", "product_name", data.product_positioning_statement.product_name || "");
      setAnswer("positioning_statement", "product_category", data.product_positioning_statement.product_category || "");
      setAnswer("positioning_statement", "key_benefit", data.product_positioning_statement.key_benefit || "");
      setAnswer("positioning_statement", "alternative", data.product_positioning_statement.alternative || "");
      setAnswer("positioning_statement", "differentiation", data.product_positioning_statement.differentiation || "");
    }
    
    // Restore methodology
    if (data.methodology) {
      setAnswer("methodology", "context", data.methodology.context || "new_dev");
    }
    
    // Restore SOO inputs
    if (data.soo_inputs) {
      setAnswer("soo_inputs", "problem_context", data.soo_inputs.problem_context || "");
      setAnswer("soo_inputs", "objectives", data.soo_inputs.objectives || "");
      setAnswer("soo_inputs", "constraints", data.soo_inputs.constraints || "");
    }
    
    // Restore review questions and checklist
    if (data.soo_review) {
      if (data.soo_review.review_questions) {
        setAnswer("soo_output", "review_questions", data.soo_review.review_questions);
      }
      if (data.soo_review.review_checklist) {
        Object.keys(data.soo_review.review_checklist).forEach(key => {
          const questionIndex = key.replace('question_', '');
          const checked = data.soo_review.review_checklist[key].reviewed || false;
          setAnswer("soo_output", `review_q_${questionIndex}`, checked);
        });
      }
    }
    
    // Restore AI-generated content
    if (data.soo_output && data.soo_output.soo_draft) {
      setAnswer("soo_output", "soo_draft", data.soo_output.soo_draft);
    }
    
    if (data.pws_vendor_pack && data.pws_vendor_pack.pws_pack_preview) {
      setAnswer("pws_vendor_pack", "pws_pack_preview", data.pws_vendor_pack.pws_pack_preview);
    }
    
    saveState();
    render();
    
    return { success: true, message: "Session restored successfully!" };
  } catch (error) {
    return { success: false, message: "Error parsing inputs.yml: " + error.message };
  }
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
    target_customer: getAnswer("positioning_statement", "target_customer", ""),
    customer_need: getAnswer("positioning_statement", "customer_need", ""),
    product_name: getAnswer("positioning_statement", "product_name", ""),
    product_category: getAnswer("positioning_statement", "product_category", ""),
    key_benefit: getAnswer("positioning_statement", "key_benefit", ""),
    alternative: getAnswer("positioning_statement", "alternative", ""),
    differentiation: getAnswer("positioning_statement", "differentiation", ""),
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
function isAiEnabled() {
  return Boolean(aiConfig.aiEndpoint && aiConfig.aiEndpoint.trim());
}
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

// Validate that an AI endpoint is reachable; otherwise, fall back to prompt-only mode
async function validateAiAvailability() {
  const endpoint = aiConfig.aiEndpoint?.trim();
  if (!endpoint) return false;

  // Block localhost endpoints when served from github.io (cannot reach local Ollama)
  const isGithubPages = window.location.hostname.endsWith('github.io');
  if (isGithubPages && endpoint.includes('localhost')) {
    console.warn('AI disabled: localhost endpoint not reachable from github.io. Falling back to prompt mode.');
    aiConfig.aiEndpoint = '';
    return false;
  }

  // For localhost or non-github.io origins, assume AI available; do not disable on failed health
  // (some local endpoints may not expose /api/health). Downstream buttons still guard on aiEndpoint presence.
  return true;
}

async function boot() {
  console.log('[BOOT] Starting wizard boot sequence...');
  const app = document.querySelector("#app");
  app.innerHTML = '<div class="usa-alert usa-alert--info"><div class="usa-alert__body"><p>Loading wizard configuration...</p></div></div>';
  try {
    loadLocalAnswers();
    await loadAiConfig(); // Ensure aiConfig is loaded before rendering
    await validateAiAvailability();
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
    // Set page/title mode based on AI availability
    const modeLabel = isAiEnabled() ? 'AI Wizard' : 'Prompt Wizard';
    document.title = `SOO Wizard (${modeLabel})`;
    const logoLink = document.querySelector('.usa-logo__text a');
    if (logoLink) logoLink.textContent = `Statement of Objectives (SOO) ${modeLabel}`;
    console.log('[BOOT] ✅ All files loaded successfully. Rendering wizard...');
    // After loading config, set stepIndex from hash or URL if present
    let initialStepId = null;
    // Prefer hash if present
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      initialStepId = hash;
    } else {
      // Fallback to ?step= param
      initialStepId = getStepIdFromUrl();
    }
    if (initialStepId) {
      const idx = state.flow.steps.findIndex(s => s.id === initialStepId);
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
