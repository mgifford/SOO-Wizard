# Veterans Mental Health Webpage - SOO Example

## Overview
This example demonstrates how to use the SOO Wizard for a real-world Veterans Affairs procurement to build a mental health resource webpage.

## Scenario
**Client:** Department of Veterans Affairs  
**Project:** Veterans Mental Health Resource Webpage Development  
**Goal:** Create a digital service that helps veterans access mental health benefits and services

## Key Features of This Example

### 1. **Veteran-Centered Outcomes**
- Focuses on what veterans can accomplish (not technical deliverables)
- Measurable objectives (5 minutes to check eligibility, 25% increase in utilization)
- Addresses real barriers veterans face (stigma, scattered information)

### 2. **Realistic Constraints** 
- VA-specific compliance (Section 508, HIPAA, VA web standards)
- Budget and timeline constraints ($1.2M, 9 months)
- Technical requirements (mobile, accessibility, bilingual)

### 3. **Outcome-Based Language**
- No tasks like "build," "develop," or "create"
- Focuses on veteran experience and results
- Allows vendors to propose their own technical approaches

## How to Use This Example

### Option 1: Import into SOO Wizard
1. Start the SOO Wizard at http://localhost:8000
2. Expand "Export and reset" accordion
3. Click "Import session" and select `inputs.yml`
4. Review and modify for your specific needs

### Option 2: Use as Template
Copy sections that apply to your project:
- Product vision approach for government digital services
- Compliance constraints template for federal agencies
- Outcome-focused objective structure
- Vendor instruction pack format

### Option 3: Demonstration Tool
Use this example to show stakeholders:
- How SOO differs from traditional RFP requirements
- What vendor-friendly procurement documents look like
- How to focus on outcomes rather than solutions

## Key Lessons from This Example

### ✅ What Works Well
```yaml
Objective: "Veterans can determine their mental health benefit eligibility within 5 minutes"
# Clear, measurable, outcome-focused

Constraint: "Must comply with Section 508 accessibility requirements" 
# Necessary boundary, not prescriptive

Problem Context: "Veterans face barriers... scattered information... avoid seeking help due to stigma"
# Describes current state without proposing solutions
```

### ❌ What to Avoid
```yaml
# Don't write this:
Requirement: "Vendor shall develop a React-based single page application"
Deliverable: "Provide wireframes, prototypes, and technical architecture"
Task: "Build integration APIs to connect with VA systems"

# Instead focus on outcomes:
Objective: "Veterans can access services through the webpage"
Constraint: "Must integrate with existing VA systems"
```

## Vendor Response Expectations

With this SOO, vendors might propose:
- **Approach A:** Progressive web app with AI-powered eligibility screening
- **Approach B:** Integration-heavy solution leveraging existing VA portals  
- **Approach C:** Mobile-first design with offline capability for rural veterans

All approaches could succeed if they achieve the veteran outcomes while meeting constraints.

## Procurement Benefits

This example demonstrates how outcome-based SOOs:
- **Increase innovation:** Vendors can propose creative solutions
- **Reduce risk:** Focus on results rather than compliance with specifications
- **Improve outcomes:** Vendors optimize for veteran success, not technical requirements
- **Enable competition:** Multiple approaches can compete on merit

## Adapting This Example

For other government digital services:
1. **Change the user group:** Replace "veterans" with your target population
2. **Adjust constraints:** Update compliance requirements for your agency
3. **Modify outcomes:** Focus on what your users need to accomplish
4. **Update context:** Describe current state challenges specific to your domain

## Files Included

- `inputs.yml` - Complete SOO Wizard session data
- `README.md` - This documentation file

## Next Steps

1. Import this example into the SOO Wizard
2. Modify for your specific procurement needs  
3. Use the generated SOO and PWS instruction pack
4. Share with procurement and legal teams for review
5. Adapt based on their feedback and agency requirements