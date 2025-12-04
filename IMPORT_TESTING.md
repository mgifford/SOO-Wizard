# Session Import/Restore - Testing Guide

## Test Scenario 1: Basic Import

### Setup
1. Open wizard at http://localhost:8000
2. Clear any existing data (click Reset if needed)
3. Verify you're on Step 1: Readiness Assessment

### Test Steps
1. Expand "Export and reset" accordion at bottom
2. Click "Import session" file input
3. Select `/Users/mgifford/soo-wizard/test_inputs.yml`
4. Verify success alert appears

### Expected Results
- ✅ Success message: "Session restored successfully!"
- ✅ Form fields populated with test data:
  - Readiness: has_po = "yes", end_user_access = "direct", approvals_cycle = "quarterly"
  - Vision Board: vision = "Build a modern case management system..."
  - Moore Template: All fields filled with CaseFlow data
  - Methodology: context = "new_dev"
  - SOO Inputs: problem_context, objectives, constraints filled
- ✅ Step circles at top show all steps are accessible
- ✅ Can navigate to any step and see restored data

## Test Scenario 2: AI Content Restoration

### Test Steps
1. After importing test_inputs.yml, navigate to Step 8: Generate SOO
2. Verify SOO draft textarea contains the test SOO text

### Expected Results
- ✅ SOO draft field shows:
  ```
  # Statement of Objectives (SOO)
  
  ## Problem Statement
  Social services departments struggle with fragmented systems...
  ```
- ✅ Draft is editable
- ✅ Can regenerate with AI without losing imported content

## Test Scenario 3: Review Checkbox Restoration

### Test Steps
1. After importing test_inputs.yml, navigate to Step 9: Critical Review
2. Check review question checkboxes

### Expected Results
- ✅ Three review questions displayed
- ✅ First two checkboxes are checked (reviewed: true in YAML)
- ✅ Third checkbox is unchecked (reviewed: false in YAML)
- ✅ Progress shows "2 / 3 reviewed"
- ✅ Checking/unchecking updates progress counter

## Test Scenario 4: PWS Pack Restoration

### Test Steps
1. After importing test_inputs.yml, navigate to Step 10: PWS Vendor Pack
2. Check PWS pack preview field

### Expected Results
- ✅ PWS pack preview shows: "# Vendor Instruction Pack\n\nPlease review the SOO..."
- ✅ Field is editable
- ✅ Can regenerate with AI

## Test Scenario 5: Export After Import

### Test Steps
1. After importing test_inputs.yml
2. Make a small edit (e.g., change product name)
3. Export bundle.zip
4. Extract and verify source/inputs.yml

### Expected Results
- ✅ Bundle exports successfully
- ✅ New inputs.yml includes imported data + your edit
- ✅ soo_output and pws_vendor_pack sections present
- ✅ All three formats export correctly (MD/HTML/RTF)

## Test Scenario 6: Cross-Session Workflow

### Test Steps
1. Start fresh wizard session
2. Fill out Steps 1-6 manually with different data
3. Export inputs.yml
4. Click Reset
5. Import the file you just exported

### Expected Results
- ✅ All manually entered data restored correctly
- ✅ Can continue from where you left off
- ✅ No data loss or corruption

## Test Scenario 7: Error Handling

### Test Steps
1. Create a corrupt YAML file (invalid syntax)
2. Try to import it

### Expected Results
- ✅ Error alert appears
- ✅ Message: "Error parsing inputs.yml: [error details]"
- ✅ Wizard state unchanged (no partial import)
- ✅ Can still use wizard normally

## Test Scenario 8: Re-import Same File

### Test Steps
1. Import test_inputs.yml
2. Make edits to several fields
3. Import test_inputs.yml again

### Expected Results
- ✅ All edits overwritten with original test data
- ✅ File input resets after import (can upload again)
- ✅ No browser errors in console

## Automated Testing Commands

```bash
# Start server
cd /Users/mgifford/soo-wizard/web
python3 run_server.py

# Open in browser
open http://localhost:8000

# Verify test file exists
ls -lh /Users/mgifford/soo-wizard/test_inputs.yml

# Check YAML syntax
python3 -c "import yaml; print(yaml.safe_load(open('/Users/mgifford/soo-wizard/test_inputs.yml')))"
```

## Browser Console Checks

Open DevTools (F12) and check:

1. **No JavaScript errors** when importing
2. **localStorage updated** after import:
   ```js
   localStorage.getItem('soo-wizard-state')
   ```
3. **State structure correct**:
   ```js
   JSON.parse(localStorage.getItem('soo-wizard-state')).answers
   ```

## Success Criteria

All tests pass when:
- ✅ Import completes without errors
- ✅ All form fields populated correctly
- ✅ AI-generated content restored
- ✅ Checkboxes reflect saved state
- ✅ Can navigate all steps
- ✅ Can continue workflow from restored state
- ✅ Export includes restored + new data
- ✅ Error handling works gracefully
- ✅ File input resets for re-upload
- ✅ No browser console errors
