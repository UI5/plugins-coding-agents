# Teardown the App

QUnit requires assertions to validate tests. Teardown methods are NOT assertions.

❌ Incorrect:
```javascript
opaTest("Should clean up", function(Given, When, Then) {
    Then.iTeardownMyApp();  // ❌ missing assertion (because teardown is not an assertion)
});
```

❌ Incorrect:
```javascript
opaTest("Should assert state and clean up", function(Given, When, Then) {
    Then.onTheWorklistPage.iShouldSeeTheTable()
      .and.onTheWorklistPage.iTeardownMyApp();  // ❌ chaining on wrong object
});
```

✅ Correct:
```javascript
opaTest("Should assert state and clean up", function(Given, When, Then) {
    Then.onTheWorklistPage.iShouldSeeTheTable() // ✅ assertion before teardown
      .and.iTeardownMyApp();  // ✅ correct chaining
});
```