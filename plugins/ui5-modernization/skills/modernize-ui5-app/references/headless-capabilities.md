# Headless Capabilities JSON — Format Spec & Parser Internals

This is the deep reference for `headless-chrome.json` and any sibling capabilities files (`headless-firefox.json`, `proxied-chrome.json`, etc.). Read it only when the inline workflow in SKILL.md isn't enough — typically because you need a non-default browser, custom prefs, a proxy, or you're debugging a parse failure that survived the SKILL.md troubleshooting.

## The contract

The capabilities file is consumed by `com.sap.ui5.selenium.qunit.JSONCapabilities.parseJSON(String json)` from the `qunit-utils` jar. The parser is hand-rolled with Gson and is strict in ways that don't match the W3C WebDriver spec. Treat it as a small DSL, not as generic Selenium JSON.

## Top-level structure

```json
{
  "<browser-name>": { ...capabilities... },
  "<other-browser-name>": { ...capabilities... }
}
```

Top-level keys are browser names, NOT capability keys. Valid keys: `chrome`, `firefox`, `safari`, `edge`, `ie`, `opera`, `phantomjs`, `htmlunit`. Only the entry whose key matches `-Dfiori.test.browser=<name>` is consumed; others are ignored.

A flat structure like `{"browserName": "chrome", "chromeOptions": {...}}` will throw `ClassCastException` from `JsonObject.getAsJsonObject(String)` because the parser tries to descend into `browserName` as if it were a browser object. The exception escapes `QUnitCapabilities`'s catch block (which only catches `IOException` / `FileNotFoundException`) and surfaces as `ExceptionInInitializerError at QUnitTest.<clinit>:218` with no `Caused by:` line in the surefire report.

## Capability keys inside a browser block

The parser recognizes a few well-known keys and treats everything else as raw `DesiredCapabilities` set-via-string.

### `goog:chromeOptions` (chrome only)

Only honored when the surrounding browser key is `chrome`. Maps to a `org.openqa.selenium.chrome.ChromeOptions` instance.

Supported sub-keys:

- `args`: JSON array of strings. Each entry is appended via `ChromeOptions.addArguments(String...)`.

The legacy alias `chromeOptions` is normalized to `goog:chromeOptions` by `JSONCapabilities.normalizeCapabilityKey` — both work, but the W3C form is preferred. No other Chrome-specific keys (binary path, extensions, prefs, mobileEmulation) are wired up; they would require a different code path in the parser.

### `moz:firefoxOptions` (firefox only)

Only honored when the surrounding browser key is `firefox`. Maps to `org.openqa.selenium.firefox.FirefoxOptions`.

Supported sub-keys:

- `prefs`: JSON array of objects, each a `{key: value}` map. The parser detects whether the value is `"true"` / `"false"` (boolean preference, set via `addPreference(String, boolean)`) or anything else (string preference). Numeric prefs go through the string overload — typically harmless, but Firefox occasionally rejects strings where it wants integers.

### `proxy`

Available for any browser. Maps to `org.openqa.selenium.Proxy`. Sub-keys are passed straight to `new Proxy(Map<String, ?>)`, so use the raw Selenium proxy keys: `httpProxy`, `sslProxy`, `socksProxy`, `noProxy`, `proxyType`, etc.

### `custom_data`

If the value is a JSON-encoded object as a string, it's parsed back out and the inner keys are merged in via `normalizeCapabilityKey`. Used to embed nested capability blobs that shouldn't be processed by `parseJSON`'s structural rules.

### Anything else

Other keys land in `DesiredCapabilities` as strings (or as parsed primitives via the `^\[.*\]$` array detection — values matching that regex are split on `,` and stored as `String[]`).

## Examples

### Headless Chrome (the canonical case — same as `assets/headless-chrome.json`)

```json
{
  "chrome": {
    "goog:chromeOptions": {
      "args": [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080"
      ]
    }
  }
}
```

### Headless Firefox

```json
{
  "firefox": {
    "moz:firefoxOptions": {
      "prefs": [
        {"general.useragent.override": "Mozilla/5.0 (...)"},
        {"dom.webdriver.enabled": "false"}
      ]
    }
  }
}
```

For headless Firefox you typically also need `args: ["-headless"]` — the parser doesn't currently honor an `args` key under `moz:firefoxOptions`, so add the flag via `MOZ_HEADLESS=1` env var or via `webdriver.firefox.binary.args` system property. If headless Firefox is critical, double-check the parser version in your local `qunit-utils-<version>.jar` — newer versions may add `args` support.

### Chrome behind a proxy

```json
{
  "chrome": {
    "goog:chromeOptions": {
      "args": ["--headless=new", "--window-size=1920,1080"]
    },
    "proxy": {
      "httpProxy": "proxy.corp.example:8080",
      "sslProxy": "proxy.corp.example:8080",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

## Parser quirks worth knowing

- Top-level browser keys are case-sensitive (`Chrome` won't match).
- `args` entries with `=` (e.g., `--window-size=1920,1080`) are passed through verbatim — Chrome accepts them.
- `goog:chromeOptions` is only consumed under `chrome`. Putting it under `firefox` (or anywhere else) silently no-ops — it ends up as a plain capability map with no effect.
- Values matching `^\[.*\]$` (a string starting with `[` and ending with `]`) get split on `,`. Avoid putting JSON-array-shaped strings in capability values — wrap as a real JSON array if you mean an array.
- The parser does NOT support the W3C `alwaysMatch` / `firstMatch` envelope. Don't wrap in `capabilities: { alwaysMatch: {...} }` — the top level must be browser names directly.

## Diagnostic recipe

When the surefire report shows `ExceptionInInitializerError at QUnitTest.<clinit>:218` with no `Caused by:`, write a small Java repro to surface the real exception. The static-init catch only handles a couple of `Exception` subclasses; everything else propagates as the bare `ExceptionInInitializerError`.

Repro template (adapt the path):

```java
public class QCTest {
    public static void main(String[] a) throws Exception {
        // (long pageLoadTimeout, long scriptTimeout, String customCapabilitiesJsonPath, String customCapabilitiesJsonString, String driverSessionName)
        new com.sap.ui5.selenium.qunit.QUnitCapabilities(
            60000L, 60000L,
            "/abs/path/to/headless-chrome.json",
            null,
            "QUnit Test Runner");
        System.out.println("ok");
    }
}
```

Compile and run against the surefire test classpath (read it from the surefire report's `<property name="surefire.test.class.path">` block). The thrown exception in this small program is the same one that's being silently swallowed inside `<clinit>`.
