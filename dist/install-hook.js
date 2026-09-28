import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
const execFile = promisify(execFileCallback);
const HOOK_MARKER = "# codex-lsp-plugin";
export async function installPreCommitHook(repoPath, cliPath) {
    const cwd = resolve(repoPath);
    const { stdout } = await execFile("git", ["rev-parse", "--git-path", "hooks/pre-commit"], {
        cwd,
        encoding: "utf8",
    });
    const rawHookPath = stdout.trim();
    const hookPath = resolve(cwd, rawHookPath);
    const existing = await readOptionalFile(hookPath);
    if (existing.includes(HOOK_MARKER))
        return { hookPath, status: "already-installed" };
    if (existing.trim().length > 0) {
        throw new Error(`Existing pre-commit hook preserved: ${hookPath}\nAdd this command to that hook:\n${hookCommand(cliPath)}`);
    }
    await mkdir(dirname(hookPath), { recursive: true });
    await writeFile(hookPath, `#!/bin/sh\n${HOOK_MARKER}\n${hookCommand(cliPath)}\n`, "utf8");
    await chmod(hookPath, 0o755);
    return { hookPath, status: "installed" };
}
function hookCommand(cliPath) {
    return `exec ${shellQuote(process.execPath)} ${shellQuote(resolve(cliPath))} check --changed`;
}
function shellQuote(value) {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
}
async function readOptionalFile(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch (error) {
        if (isNotFound(error))
            return "";
        throw error;
    }
}
function isNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
