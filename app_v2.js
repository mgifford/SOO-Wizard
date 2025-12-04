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
    
    // Capture readiness assessment in audit
    const has_po = getAnswer("readiness", "has_po", "").toLowerCase();
    const end_user = getAnswer("readiness", "end_user_access", "").toLowerCase();
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
      summary: summary
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
              <p>No SOO draft found. Please go back to Step 8 and generate a draft first.</p>
            </div>
          </div>
        `;
      }
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
      
      // Render existing questions as checkboxes if available
      const renderQuestions = (questions) => {
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
      if (reviewQuestions) {
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
5. Format questions as a numbered list

SOO DRAFT:
${draft}

GENERATE CRITICAL REVIEW QUESTIONS:`;
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
        messages.appendChild(renderLintAlert(lint));
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
          has_po: getAnswer("readiness", "has_po", ""),
          end_user_access: getAnswer("readiness", "end_user_access", ""),
          approvals_cycle: getAnswer("readiness", "approvals_cycle", ""),
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
        has_po: getAnswer("readiness", "has_po", ""),
        end_user_access: getAnswer("readiness", "end_user_access", ""),
        approvals_cycle: getAnswer("readiness", "approvals_cycle", ""),
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
    },
    soo_review: {
      review_questions: reviewQuestions,
      review_checklist: reviewChecklist,
      total_questions: Object.keys(reviewChecklist).length,
      questions_reviewed: Object.values(reviewChecklist).filter(q => q.reviewed).length
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
