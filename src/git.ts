import { Err, Ok, Result } from "@ghaerdi/rustify/result"
import { Option } from "@ghaerdi/rustify/option";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const enum GitError {
  NotInitialized = "Git is not initialized",
  NoFilesStaged = "No files staged"
}

async function isInsideWorkTree(): Promise<Result<boolean, unknown>> {
  const output = await Result.fromAsync(async () => {
    const { stdout } = await exec('git', ['rev-parse', '--is-inside-work-tree']);
    return stdout;
  });
  return output.map(v => v.trim() === "true");
}

export const git = {
  async currentBranch(): Promise<Option<string>> {
    const output = await Result.fromAsync(async () => {
      const { stdout } = await exec('git', ['branch', '--show-current']);
      return stdout;
    });
    return output.ok()
  },
  async checkInit(): Promise<Result<true, GitError>> {
    const inWorkTree = await isInsideWorkTree();
    return inWorkTree
      .andThen(value => value ? Ok(value) : Err(GitError.NotInitialized))
      .mapErr(() => GitError.NotInitialized)
  },
  async files(): Promise<Result<string[], GitError>> {
    const output = await Result.fromAsync(
      async () => {
        const { stdout } = await exec('git', ['diff', '--cached', '--diff-algorithm=minimal', '--name-only']);
        return stdout;
      },
      _err => GitError.NoFilesStaged,
    );
    return output
      .map(value => value.split("\n").filter(line => Boolean(line)))
      .andThen(v => v.length ? Ok(v) : Err(GitError.NoFilesStaged))
  },
  async diff(): Promise<Result<string, GitError>> {
    return await Result.fromAsync(
      async () => {
        const { stdout } = await exec('git', ['diff', '--cached', '--diff-algorithm=minimal']);
        return stdout;
      },
      _err => GitError.NoFilesStaged
    )
  },
  async commit(message: string, noVerify = false): Promise<void> {
    console.log("\n");
    const args = ['commit', '-m', message];
    if (noVerify) args.push('--no-verify');
    const { stdout } = await exec('git', args);
    console.log(stdout);
  }
}
