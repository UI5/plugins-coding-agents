# Initial Setup

1. **ALWAYS** use this folder layout:
```
test/integration/
├── opaTests.qunit.js   ← single entry point
├── pages/
│   ├── Welcome.js      ← one page object per view (name matches the view)
│   ├── Items.js
│   └── Browser.js      ← cross-view actions (navigation, hash)
├── WelcomeJourney.js   ← one journey per feature/functionality
└── FilterItemsJourney.js
```

2. **ALWAYS** enable `autoWait` and define `viewNamespace` globally in `opaTests.qunit.js`.
```javascript
// opaTests.qunit.js
sap.ui.define(["sap/ui/test/Opa5"], function (Opa5) {
	"use strict";
    Opa5.extendConfig({
		autoWait: true,
		viewNamespace: "com.myorg.myapp.view."
	});
```