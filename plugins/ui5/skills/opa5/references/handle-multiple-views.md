# Page Object Organization Across Multiple Views

**ALWAYS** add the new actions/assertions to the semantically corresponding page object

Example 1:  
❌ Anti-Pattern:  
Adding selector for a control from `App.view.xml` into the page object for its **nested** view (e.g. into `integration/pages/Detail.js` for `Detail.view.xml`):
```javascript
// integration/pages/Detail.js
iShouldSeeTheAppInFullScreenMode() {
	return this.waitFor({
		id: "layout",
		viewName: "App",
		success: function () { ... }
	});
},
```
✅ Correct Pattern:  
Place the assertion for the `App.view.xml` in page object file `integration/pages/App.js`

Example 2:  
❌ Anti-Pattern:  
View-specific page object file containing selector for cross-view navigation:
```javascript
// integration/pages/Detail.js
iShouldSeeTheHash(sExpectedHash) {
	return this.waitFor({
		success: function () {
			Opa5.assert.strictEqual(Opa5.getHashChanger().getHash(), sExpectedHash, "The Hash not correct");
		}
	});
},
```
✅ Correct Pattern:  
Place the actions/assertions for cross-view navigation into page object `integration/pages/Browser.js`
