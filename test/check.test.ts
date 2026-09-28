import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { checkFiles, getStagedFiles } from "../src/check.js";

describe("staged LSP check", () => {
	it("finds only staged added or modified files", async () => {
		const repo = mkdtempSync(join(tmpdir(), "codex-lsp-check-"));
		execFileSync("git", ["init", "--quiet"], { cwd: repo });
		writeFileSync(join(repo, "staged.ts"), "export const staged = true;\n");
		writeFileSync(join(repo, "unstaged.ts"), "export const unstaged = true;\n");
		execFileSync("git", ["add", "staged.ts"], { cwd: repo });

		await expect(getStagedFiles(repo)).resolves.toEqual([join(realpathSync(repo), "staged.ts")]);
	});

	it("checks supported files, skips unsupported files, and reports diagnostics", async () => {
		const checked: string[] = [];
		const result = await checkFiles(
			["/repo/clean.ts", "/repo/notes.md", "/repo/broken.ts"],
			async (filePath) => {
				checked.push(filePath);
				const broken = filePath.endsWith("broken.ts");
				return {
					content: [{ type: "text", text: broken ? "error[typescript] at 1:1: Broken" : "No diagnostics found" }],
					details: {
						filePath,
						severity: "error",
						mode: "file",
						diagnostics: [],
						totalDiagnostics: broken ? 1 : 0,
						truncated: false,
					},
				};
			},
			(extension) =>
				extension === ".ts"
					? {
							status: "found",
							server: {
								id: "typescript",
								command: ["typescript-language-server", "--stdio"],
								extensions: [".ts"],
								priority: 1,
							},
						}
					: { status: "not_configured", extension, availableServers: [] },
		);

		expect(checked).toEqual(["/repo/clean.ts", "/repo/broken.ts"]);
		expect(result.skipped).toEqual(["/repo/notes.md"]);
		expect(result.failures).toEqual(["error[typescript] at 1:1: Broken"]);
	});

	it("fails when a configured language server is missing", async () => {
		const result = await checkFiles(
			["/repo/main.py"],
			async () => {
				throw new Error("diagnostics must not run without a server");
			},
			() => ({
				status: "not_installed",
				server: { id: "pyright", command: ["pyright-langserver", "--stdio"], extensions: [".py"] },
				installHint: "Install pyright",
			}),
		);

		expect(result.failures).toEqual(["/repo/main.py: Install pyright"]);
	});

	it("reports language-server process failures without aborting remaining checks", async () => {
		const result = await checkFiles(
			["/repo/first.ts", "/repo/second.ts"],
			async (filePath) => {
				if (filePath.endsWith("first.ts")) throw new Error("server exited with code 1");
				return {
					content: [{ type: "text", text: "No diagnostics found" }],
					details: { totalDiagnostics: 0 },
				};
			},
			() => ({
				status: "found",
				server: {
					id: "typescript",
					command: ["typescript-language-server", "--stdio"],
					extensions: [".ts"],
					priority: 1,
				},
			}),
		);

		expect(result.checked).toEqual(["/repo/first.ts", "/repo/second.ts"]);
		expect(result.failures).toEqual(["/repo/first.ts: server exited with code 1"]);
	});
});
