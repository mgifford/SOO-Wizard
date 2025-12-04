// SOO Wizard v2.0 - Updated 2025-12-02T23:15:00Z
// Force cache invalidation with timestamp
const CACHE_BUST = "?v=20251202-231500";
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

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  return await r.text();
}
async function fetchYml(url) {
  const txt = await fetchText(url);
  return window.jsyaml.load(txt);
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
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
  saveState();
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

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = "";
  const step = state.flow.steps[state.stepIndex];

  app.appendChild(el(`
    <div class="card">
      <div class="display-flex flex-justify flex-align-center">
        <h1 class="margin-y-0">${step.title}</h1>
        <div class="text-base text-ink">Step ${state.stepIndex + 1} of ${state.flow.steps.length}</div>
      </div>
      <p class="margin-top-2">${step.help || ""}</p>

      <div id="fields" class="margin-top-2"></div>
      <div id="messages" class="margin-top-2"></div>

      <div class="margin-top-3 display-flex flex-justify">
        <button class="usa-button usa-button--outline" id="back" ${state.stepIndex === 0 ? "disabled" : ""}>Back</button>
        <button class="usa-button" id="next">${step.id === "generate" ? "Generate SOO" : step.id === "soo_output" ? "Accept & Continue" : "Next"}</button>
      </div>

      <hr class="margin-top-4" />
      <details class="usa-accordion">
        <summary class="usa-accordion__button">Export and reset</summary>
        <div class="usa-accordion__content">
          <button class="usa-button usa-button--outline" id="exportInputs">Download inputs.yml</button>
          <button class="usa-button usa-button--outline" id="reset">Reset wizard</button>
        </div>
      </details>
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
    step.fields.forEach(f => {
      const fieldNode = renderField(step.id, f);
      if (fieldNode) fields.appendChild(fieldNode);
    });
  } else {
    fields.appendChild(el(`<p class="text-base">No fields on this step.</p>`));
  }

  // If soo_output, populate soo_draft field
  if (step.id === "soo_output") {
    const existing = getAnswer("soo_output", "soo_draft", "");
    if (existing) {
      const ta = fields.querySelector("textarea");
      if (ta) ta.value = existing;
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
      if (ta) ta.value = pwsPack;
    }
  }

  app.querySelector("#back").addEventListener("click", () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    render();
  });

  app.querySelector("#next").addEventListener("click", async () => {
    const messages = app.querySelector("#messages");
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

    state.stepIndex = Math.min(state.flow.steps.length - 1, state.stepIndex + 1);
    render();
  });

  app.querySelector("#exportInputs").addEventListener("click", () => {
    downloadText("inputs.yml", buildInputsYml());
  });

  app.querySelector("#reset").addEventListener("click", () => {
    if (confirm("Reset all answers? This cannot be undone.")) {
      state.answers = {};
      state.audit = { events: [] };
      saveState();
      state.stepIndex = 0;
      render();
    }
  });
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
        <textarea class="usa-textarea" id="${stepId}.${f.id}" rows="25" style="font-family: monospace; font-size: 14px; box-sizing: border-box; height: 242px;">${escapeHtml(value)}</textarea>
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
    },
    settings: {
      ai_endpoint: getAnswer("settings", "ai_endpoint", "http://localhost:11434"),
      ai_model: getAnswer("settings", "ai_model", "llama3.1"),
      ai_timeout_seconds: getAnswer("settings", "ai_timeout_seconds", "120")
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

  const endpoint = getAnswer("settings", "ai_endpoint", "").trim();
  const model = getAnswer("settings", "ai_model", "llama3.1").trim();
  const timeout = parseInt(getAnswer("settings", "ai_timeout_seconds", "120")) * 1000;

  if (!endpoint) {
    messages.appendChild(el(`
      <div class="usa-alert usa-alert--warning">
        <div class="usa-alert__body">
          <h3 class="usa-alert__heading">No AI endpoint configured</h3>
          <p>Running in prompt-only mode. Copy the prompt below, run it through your local LLM (e.g., Ollama), and paste the output on the next screen.</p>
        </div>
      </div>
    `));
    
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

    const promptCard = el(`
      <div class="card margin-top-2">
        <h4>1. Copy this prompt and run through your local LLM</h4>
        <textarea class="usa-textarea mono" readonly id="promptText" rows="25" style="font-family: monospace; font-size: 14px; box-sizing: border-box; height: 242px;"></textarea>
        <button class="usa-button usa-button--outline margin-top-2" id="copyPrompt">Copy prompt</button>
      </div>
    `);
    
    promptCard.querySelector("#promptText").value = prompt;
    promptCard.querySelector("#copyPrompt").addEventListener("click", () => {
      promptCard.querySelector("#promptText").select();
      document.execCommand("copy");
      alert("Prompt copied to clipboard!");
    });

    const outputCard = el(`
      <div class="card margin-top-2">
        <h4>2. Paste the AI output here</h4>
        <textarea class="usa-textarea mono" rows="25" style="font-family: monospace; font-size: 14px; box-sizing: border-box; height: 242px;"  id="sooText" placeholder="Paste AI response here..."></textarea>
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

  let text;
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
    messages.appendChild(el(`
      <div class="usa-alert usa-alert--error">
        <div class="usa-alert__body">
          <h3 class="usa-alert__heading">Local AI call failed</h3>
          <p class="usa-alert__text">${escapeHtml(e.message || "Unknown error")}</p>
          <p class="usa-alert__text">
            Check that Ollama is running at ${escapeHtml(endpoint)} and CORS is permitted.
            You can also run in prompt-only mode: clear the endpoint and regenerate.
          </p>
        </div>
      </div>
    `));

    state.audit.events.push({
      timestamp: new Date().toISOString(),
      event: "ai_call_failed",
      error: e.message
    });
    
    return;
  }

  const outLint = lintText(text);
  if (outLint.summary.hasErrors) {
    messages.appendChild(el(`
      <div class="usa-alert usa-alert--warning">
        <div class="usa-alert__body">
          <h3 class="usa-alert__heading">Generated SOO has issues</h3>
          <p class="usa-alert__text">Review and edit below to fix violations, or click "Regenerate" to try again.</p>
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

  const inputsYml = buildInputsYml();
  
  const outputCard = el(`
    <div class="card margin-top-3">
      <h3 class="margin-top-0">Generated SOO Draft</h3>
      <p class="text-base">Review and edit below. Click "Accept & Continue" to proceed, or "Regenerate" to re-run.</p>
      <textarea class="usa-textarea mono" id="sooText" rows="18"></textarea>

      <div class="margin-top-2 display-flex flex-justify">
        <button class="usa-button usa-button--outline" id="regenerate">Regenerate</button>
        <div>
          <button class="usa-button usa-button--outline" id="downloadPrompt">Download prompt.txt</button>
          <button class="usa-button" id="acceptOutput">Accept & Continue</button>
        </div>
      </div>
    </div>
  `);

  outputCard.querySelector("#sooText").value = text || "";
  
  outputCard.querySelector("#downloadPrompt").addEventListener("click", () => {
    downloadText("prompt.txt", prompt);
  });

  outputCard.querySelector("#regenerate").addEventListener("click", () => {
    state.stepIndex--;
    render();
  });

  outputCard.querySelector("#acceptOutput").addEventListener("click", () => {
    const output = outputCard.querySelector("#sooText").value;
    setAnswer("soo_output", "soo_draft", output);
    state.audit.events.push({
      timestamp: new Date().toISOString(),
      event: "soo_draft_accepted",
      lintSummary: outLint.summary
    });
    state.stepIndex++;
    render();
  });

  messages.appendChild(outputCard);
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

async function boot() {
  state.flow = await fetchYml(FLOW_URL);
  state.rules = await fetchYml(LINT_RULES_URL);
  state.prompts.soo = await fetchYml(PROMPT_SOO_URL);
  state.prompts.pws = await fetchYml(PROMPT_PWS_URL);
  state.prompts.rewrite = await fetchYml(PROMPT_REWRITE_URL);
  render();
}

boot().catch(e => {
  const app = document.querySelector("#app");
  app.innerHTML = `<div class="usa-alert usa-alert--error"><div class="usa-alert__body"><h3 class="usa-alert__heading">Failed to start</h3><p class="usa-alert__text">${escapeHtml(e.message)}</p></div></div>`;
});
