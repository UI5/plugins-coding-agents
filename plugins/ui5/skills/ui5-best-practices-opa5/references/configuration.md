# Configuration

1. Use this folder layout for page objects and journeys:
```
test/integration/
├── pages/
│   ├── Welcome.js      ← one page object per view (name matches the view)
│   ├── Items.js
│   └── Browser.js      ← cross-view actions (navigation, hash)
├── WelcomeJourney.js   ← one journey per feature/functionality
└── FilterItemsJourney.js
└── ...
```

2. Default test entry point is `test/integration/opaTest.qunit.js`. Skip this file if your instructions already specify a different test entry point.

3. **ALWAYS** enable `autoWait` and define `viewNamespace` globally in the test entry point.
```javascript
// in the test entry point 
sap.ui.define(["sap/ui/test/Opa5"], (Opa5) => {
	"use strict";
    Opa5.extendConfig({
		autoWait: true,
		viewNamespace: "com.myorg.myapp.view." // Replace with your actual app namespace
	});
	// ...
});
```