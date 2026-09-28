import { findServerForExtension } from "../packages/lsp-tools-mcp/dist/lsp/server-resolution.js";
import type { ToolExecutionResult } from "../packages/lsp-tools-mcp/dist/tools.js";
export type DiagnosticsRunner = (filePath: string) => Promise<ToolExecutionResult>;
export type ServerResolver = typeof findServerForExtension;
export interface LspCheckResult {
    checked: string[];
    skipped: string[];
    failures: string[];
}
export declare function getStagedFiles(cwd: string): Promise<string[]>;
export declare function checkFiles(filePaths: readonly string[], runDiagnostics?: DiagnosticsRunner, resolveServer?: ServerResolver): Promise<LspCheckResult>;
export declare function runChangedCheck(cwd?: string): Promise<number>;
