import { execFile as execFileCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { promisify } from "node:util";
import { findServerForExtension } from "../packages/lsp-tools-mcp/dist/lsp/server-resolution.js";
import { executeLspDiagnostics } from "../packages/lsp-tools-mcp/dist/tools.js";
const execFile = promisify(execFileCallback);
export async function getStagedFiles(cwd) {
    const { stdout: rootOutput } = await execFile("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
    const repoRoot = rootOutput.trim();
    const { stdout } = await execFile("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
        cwd: repoRoot,
        encoding: "utf8",
    });
    return stdout
        .split("\0")
        .filter((filePath) => filePath.length > 0)
        .map((filePath) => resolve(repoRoot, filePath))
        .filter(existsSync);
}
export async function checkFiles(filePaths, runDiagnostics = (filePath) => executeLspDiagnostics({ filePath, severity: "error" }), resolveServer = findServerForExtension) {
    const result = { checked: [], skipped: [], failures: [] };
    for (const filePath of filePaths) {
        const lookup = resolveServer(extname(filePath));
        if (lookup.status === "not_configured") {
            result.skipped.push(filePath);
            continue;
        }
        if (lookup.status === "not_installed") {
            result.failures.push(`${filePath}: ${lookup.installHint}`);
            continue;
        }
        result.checked.push(filePath);
        let diagnostics;
        try {
            diagnostics = await runDiagnostics(filePath);
        }
        catch (error) {
            result.failures.push(`${filePath}: ${errorMessage(error)}`);
            continue;
        }
        const details = asDiagnosticsDetails(diagnostics.details);
        if (details?.error) {
            result.failures.push(`${filePath}: ${details.error}`);
            continue;
        }
        if ((details?.totalDiagnostics ?? 0) > 0) {
            result.failures.push(...diagnostics.content.map((block) => block.text).filter((text) => text.length > 0));
        }
    }
    return result;
}
export async function runChangedCheck(cwd = process.cwd()) {
    const files = await getStagedFiles(cwd);
    const result = await checkFiles(files);
    if (result.failures.length > 0) {
        process.stderr.write(`LSP pre-commit failed:\n${result.failures.map((failure) => `- ${failure}`).join("\n")}\n`);
        return 1;
    }
    process.stdout.write(`LSP pre-commit passed: ${result.checked.length} checked, ${result.skipped.length} unsupported skipped.\n`);
    return 0;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function asDiagnosticsDetails(value) {
    if (typeof value !== "object" || value === null || !("totalDiagnostics" in value))
        return undefined;
    return value;
}
