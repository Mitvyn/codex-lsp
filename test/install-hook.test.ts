import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { installPreCommitHook } from "../src/install-hook.js";

function makeRepo(): string {
	const repo = mkdtempSync(join(tmpdir(), "codex-lsp-hook-"));
	execFileSync("git", ["init", "--quiet"], { cwd: repo });
	return repo;
}

describe("pre-commit hook installer", () => {
	it("installs an executable hook and is idempotent", async () => {
		const repo = makeRepo();
		const first = await installPreCommitHook(repo, "/plugin/dist/cli.js");
		const second = await installPreCommitHook(repo, "/plugin/dist/cli.js");
		const hook = readFileSync(first.hookPath, "utf8");

		expect(first.status).toBe("installed");
		expect(second.status).toBe("already-installed");
		expect(hook).toContain("# codex-lsp-plugin");
		expect(hook).toContain("'/plugin/dist/cli.js' check --changed");
	});

	it("preserves an existing unrelated hook", async () => {
		const repo = makeRepo();
		const hookPath = join(repo, ".git", "hooks", "pre-commit");
		writeFileSync(hookPath, "#!/bin/sh\nnpm test\n");

		await expect(installPreCommitHook(repo, "/plugin/dist/cli.js")).rejects.toThrow(
			"Existing pre-commit hook preserved",
		);
		expect(readFileSync(hookPath, "utf8")).toBe("#!/bin/sh\nnpm test\n");
	});
});
