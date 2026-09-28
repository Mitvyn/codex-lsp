export interface HookInstallResult {
    hookPath: string;
    status: "installed" | "already-installed";
}
export declare function installPreCommitHook(repoPath: string, cliPath: string): Promise<HookInstallResult>;
