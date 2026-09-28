#!/usr/bin/env node
import { resolve } from "node:path";
import { argv, stderr, stdout } from "node:process";
import { disposeDefaultLspManager } from "../packages/lsp-tools-mcp/dist/lsp/manager.js";
import { runMcpStdioServer } from "../packages/lsp-tools-mcp/dist/mcp.js";
import { runChangedCheck } from "./check.js";
import { runPostToolUseHookCli } from "./codex-hook.js";
import { installPreCommitHook } from "./install-hook.js";
async function main() {
    const [command = "mcp", subcommand = ""] = argv.slice(2);
    try {
        if (command === "hook" && subcommand === "post-tool-use") {
            await runPostToolUseHookCli();
            return;
        }
        if (command === "mcp") {
            await runMcpStdioServer();
            return;
        }
        if (command === "check" && subcommand === "--changed") {
            process.exitCode = await runChangedCheck();
            return;
        }
        if (command === "install-hook") {
            const cliPath = argv[1];
            if (!cliPath)
                throw new Error("Cannot resolve codex-lsp CLI path");
            const result = await installPreCommitHook(subcommand || process.cwd(), resolve(cliPath));
            stdout.write(`LSP pre-commit hook ${result.status}: ${result.hookPath}\n`);
            return;
        }
        stderr.write("Usage: codex-lsp [mcp | hook post-tool-use | check --changed | install-hook [repo]]\n");
        process.exitCode = 2;
    }
    finally {
        await disposeDefaultLspManager();
    }
}
main().catch(async (error) => {
    stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    await disposeDefaultLspManager();
    process.exitCode = 1;
});
