# Developing UI5 Plugins for Coding Agents

**Note:** This guide is for people who work *on* the UI5 plugins for coding agents. If you just want to use the plugins, you don't need anything here.


## Release

Everything lives in this one repository — all three plugins (`ui5`, `ui5-modernization`, and `ui5-typescript-conversion`) are developed and versioned here together. Getting a new version out to users is a two-step affair:

1. **Release it here first.** This creates the new version and Git tag in this repository.
2. **Then let the marketplaces catch up.** Both the Anthropic and GitHub Copilot marketplaces pull the plugins from this repository. The Anthropic one refreshes itself automatically every night, so there's nothing to do there. GitHub Copilot, on the other hand, pins to a fixed tag and won't move until someone opens a pull request to bump it.

The sections below walk through all three steps.

### 1. Releasing here

We let [release-please](https://github.com/googleapis/release-please) do the heavy lifting. It runs from [release-please.yml](../.github/workflows/release-please.yml) and is configured in [release-please-config.json](../release-please-config.json) and [.release-please-manifest.json](../.release-please-manifest.json). All three plugins share one version number, so they always move together.

Here's how a release comes together:

1. Land your changes on `main` using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, and friends). Those prefixes are what tell release-please how to write the changelog and how far to bump the version.
2. On every push to `main`, release-please quietly keeps a release pull request up to date (you'll recognize it by its `release: vX.Y.Z` title). It collects the pending changes into [CHANGELOG.md](../CHANGELOG.md) and bumps the version in every `plugin.json`.
3. When you're ready to ship, **rebase and merge that pull request.** release-please takes it from there: it tags the commit `vX.Y.Z` and cuts the matching GitHub Release.

One thing worth knowing: thanks to the `extra-files` setting in [release-please-config.json](../release-please-config.json), the version gets bumped in *two* copies of each plugin's manifest:

- `plugins/<name>/plugin.json` — the one Claude Code actually reads.
- `plugins/<name>/.github/plugin/plugin.json` — a duplicate that the GitHub Copilot `awesome-copilot` smoke test insists on.

To make sure those two never quietly drift apart, [CI](../.github/workflows/ci.yml) checks that the `.github/plugin/plugin.json` copy is identical to the root one down to the byte.

Once the release is out, jot down the version it produced — specifically the Git tag `vX.Y.Z`. You'll need it for the GitHub Copilot marketplace below.

### 2. Anthropic marketplace (`claude-plugins-official`)

This is where users get the plugins when they run:

```bash
claude plugin install ui5@claude-plugins-official
```

Behind that command is the [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) repository. It pulls our plugins in through `.claude-plugin/marketplace.json`, where each plugin has an entry that tracks the `main` branch of this repository:

```json
{
    "name": "ui5",
    "source": {
        "source": "git-subdir",
        "url": "https://github.com/UI5/plugins-coding-agents.git",
        "path": "plugins/ui5",
        "ref": "main",
        "sha": "<commit-sha>"
    }
}
```

The good news: you don't have to do anything here. Because the entries follow `main`, the marketplace re-syncs from this repository automatically every night and the pinned `sha` is refreshed for you. Once your release is merged to `main`, it'll show up in the Anthropic marketplace by the next day on its own.

### 3. GitHub Copilot marketplace (`awesome-copilot`)

This is the equivalent for Copilot users, who install with:

```bash
copilot plugin install ui5@awesome-copilot
```

Here the marketplace is the [github/awesome-copilot](https://github.com/github/awesome-copilot) repository, which lists our plugins as external plugins in `plugins/external.json`. Each entry is pinned to a subdirectory and a Git tag:

```json
{
    "name": "ui5",
    "version": "X.Y.Z",
    "source": {
        "source": "github",
        "repo": "UI5/plugins-coding-agents",
        "path": "plugins/ui5",
        "ref": "vX.Y.Z"
    }
}
```

Shipping the new version here is a bit more hands-on. Here's the routine:

1. Fork the [github/awesome-copilot](https://github.com/github/awesome-copilot) repository (and clone your fork).
2. In `plugins/external.json`, for **each** of the three entries (`ui5`, `ui5-modernization`, `ui5-typescript-conversion`):
   - Set `version` to the new version (no leading `v` here).
   - Set `source.ref` to the new Git tag `vX.Y.Z`.
3. Run `npm i` to install the repository's tooling.
4. Run `npm start`. This regenerates the marketplace manifest (`.github/plugin/marketplace.json`) from your edits to `external.json`.
5. Commit **both** changed files — `plugins/external.json` and the regenerated `.github/plugin/marketplace.json` — and open the pull request against [github/awesome-copilot](https://github.com/github/awesome-copilot).

Do check their [contribution guidelines](https://github.com/github/awesome-copilot) before you open the PR. Their repository runs a smoke test that installs each external plugin straight from the pinned ref.
