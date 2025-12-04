# RFP-to-SOO Conversion Prompt

Use this prompt with any AI tool (ChatGPT, Claude, Gemini, etc.) to analyze existing RFPs and generate SOO Wizard example files.

## The Prompt

```
You are an expert procurement advisor who specializes in converting traditional task-based RFPs into outcome-focused Statements of Objectives (SOO). 

I will provide you an existing RFP, and I need you to analyze it and generate two files:

1. **inputs.yml** - A complete SOO Wizard session file
2. **README.md** - Documentation explaining the conversion and key insights

## Analysis Framework

### STEP 1: RFP Analysis
Identify from the RFP:
- **Client agency and context** (federal, state, local government)
- **Current problems** being addressed (extract from background sections)
- **Desired outcomes** (hidden within requirements and deliverables)
- **User groups** who will benefit from the solution
- **Constraints** (budget, timeline, compliance requirements)
- **Success metrics** (performance standards, user satisfaction goals)

### STEP 2: SOO Transformation
Convert task-based language to outcome-focused language:
- **Replace "shall build/develop/create"** with "users can accomplish X"
- **Replace deliverable lists** with measurable user outcomes
- **Replace technical specifications** with performance requirements
- **Extract real constraints** from compliance and policy requirements
- **Identify the true product vision** behind the technical requirements

### STEP 3: Generate inputs.yml
Create a complete SOO Wizard session file with this structure:

```yaml
version: 1
metadata:
  createdAt: '[current date in ISO format]'
  wizardVersion: '2.0'
readiness:
  has_po: '[yes/no based on RFP structure]'
  end_user_access: '[direct/indirect/none based on user engagement described]'
  approvals_cycle: '[monthly/quarterly/semi-annual/annual based on government type]'
product_vision_board:
  vision: '[3-5 year vision of what success looks like for users]'
  target_group: '[primary users who will benefit from the solution]'
  needs: '[user needs and problems being addressed]'
  product: '[solution category without prescribing technology]'
  business_goals: '[measurable organizational outcomes]'
product_vision_moore:
  target_customer: '[primary customer/user group]'
  customer_need: '[core need being addressed]'
  product_name: '[descriptive name for the solution]'
  product_category: '[solution category]'
  key_benefit: '[primary value proposition]'
  alternative: '[current state or competing approaches]'
  differentiation: '[what makes this approach unique]'
  moore_statement: '[complete Moore template sentence]'
methodology:
  context: '[new_dev/maintenance/ops/discovery/migration based on project type]'
soo_inputs:
  problem_context: '[current state problems without proposing solutions]'
  objectives: '[outcome-focused goals that users/organization will achieve]'
  constraints: '[real boundaries including compliance, budget, timeline]'
soo_review:
  review_questions: '[5-8 questions to validate the SOO approach]'
  review_checklist:
    question_0:
      text: '[first review question]'
      reviewed: false
    # [continue for each question]
  total_questions: '[number of questions]'
  questions_reviewed: 0
soo_output:
  soo_draft: |
    [Complete SOO markdown with Problem Statement, Objectives, Constraints sections]
pws_vendor_pack:
  pws_pack_preview: |
    [Vendor instruction pack explaining how to respond to the SOO]
```

### STEP 4: Generate README.md
Create documentation with this structure:

```markdown
# [Project Name] - SOO Example

## Overview
[Brief description of the project and conversion from original RFP]

## Original RFP Analysis
**Client:** [Agency name and level]  
**Original Project Type:** [What the RFP called for]  
**SOO Focus:** [What the outcome-based approach emphasizes instead]

## Key Transformation Insights

### What Changed from RFP to SOO
**Original RFP Language:**
- [Example of task-based requirement]
- [Example of deliverable specification]

**SOO Transformation:**
- [How it became outcome-focused]  
- [How users benefit instead]

### Compliance and Constraints
- [Key regulatory requirements]
- [Budget and timeline constraints]  
- [Technical or policy limitations]

## Expected Vendor Innovation
This SOO enables vendors to propose:
- [Innovation opportunity 1]
- [Innovation opportunity 2]  
- [Innovation opportunity 3]

## Success Metrics
- [Measurable outcome 1]
- [Measurable outcome 2]
- [User satisfaction targets]

## Files Included
- `inputs.yml` - Complete SOO Wizard session data
- `README.md` - This documentation

## Next Steps
1. Import inputs.yml into SOO Wizard
2. Customize for specific needs
3. Review with procurement and legal teams
4. Generate final SOO and vendor instruction pack
```

## Instructions for Use

1. **Paste this entire prompt** into your AI tool
2. **Add the RFP text** at the end with "Here is the RFP to analyze: [paste RFP content]"
3. **Review the generated files** for accuracy and completeness
4. **Create the example directory** and save both files
5. **Test import** into SOO Wizard to verify format correctness

## Quality Checklist

Ensure the generated inputs.yml includes:
- ✅ All required YAML sections and proper formatting
- ✅ Outcome-focused objectives (not tasks or deliverables)
- ✅ Realistic constraints from the original RFP context
- ✅ Measurable success criteria
- ✅ Complete Moore template statement
- ✅ Valid YAML syntax (test with SOO Wizard import)

Ensure the README.md explains:
- ✅ What changed from RFP to SOO approach
- ✅ Key compliance and constraint considerations
- ✅ Innovation opportunities the SOO enables
- ✅ Expected outcomes and success metrics

---

**Now paste your RFP content below and I'll generate both files:**
```

## How to Use This Prompt

1. **Copy the entire prompt above** (everything in the code block)
2. **Paste it into ChatGPT, Claude, or your preferred AI tool**
3. **Add your RFP content** at the end
4. **Get both files generated** automatically
5. **Create new example directory** and save the files
6. **Test import** into SOO Wizard

This approach lets you quickly convert any existing RFP into a working SOO example that demonstrates the outcome-focused approach.