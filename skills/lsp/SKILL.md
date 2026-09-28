---
name: lsp
description: Use for language-server diagnostics, definitions, references, symbols, rename safety, LSP configuration, or installing and troubleshooting Codex LSP pre-commit hooks in a repository.
---

# Codex LSP

Call `lsp` MCP tools through the tool interface; `lsp.*`/`mcp__lsp__*` are tool-call names, not shell commands.

## Tools

- `lsp.status`: list configured, installed, missing, disabled, and active language servers.
- `lsp.diagnostics`: check one file or directory for LSP diagnostics. Prefer `severity: "error"` after edits.
- `lsp.goto_definition`: locate a symbol definition from file, line, and character.
- `lsp.find_references`: find usages of a symbol across the workspace.
- `lsp.symbols`: inspect document symbols or search workspace symbols.
- `lsp.prepare_rename`: check whether a rename is valid at a position.
- `lsp.rename`: apply a language-server workspace edit for a rename.

## Config

Project config lives at `.codex/lsp-client.json`; user config lives at `~/.codex/lsp-client.json`.

```json
{
	"lsp": {
		"typescript": {
			"command": ["typescript-language-server", "--stdio"],
			"extensions": [".ts", ".tsx", ".js", ".jsx"]
		}
	}
}
```

Use `lsp.status` first when diagnostics report a missing language server.

## Pre-commit setup

When asked to set up, install, or troubleshoot the Codex LSP pre-commit hook:

1. Confirm target is Git repository and inspect any existing pre-commit hook or hook manager.
2. Run `codex-lsp install-hook /absolute/path/to/repository` when `codex-lsp` is on `PATH`. Otherwise invoke installed plugin entrypoint with `node /absolute/path/to/codex-lsp-plugin/dist/cli.js install-hook /absolute/path/to/repository`.
3. Never replace unrelated hook. Installer refuses overwrite and prints command to integrate into existing hook or hook manager.
4. Stage supported file and run hook or `codex-lsp check --changed` to verify clean files pass and error diagnostics block commit. Restore test-only edits afterward.

Hook installation is per repository. Do not configure global Git `core.hooksPath`; it can bypass project-owned hooks such as Husky.

For commit preparation, run repository's normal checks plus `codex-lsp check --changed`. Check is deterministic, reads staged files only, and consumes no model tokens.
