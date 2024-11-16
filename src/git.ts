import { Err, Ok, Result } from "@ghaerdi/rustify/result"
import { Option } from "@ghaerdi/rustify/option";
import { $ } from "bun";

const enum GitError {
  NotInitialized = "Git is not initialized",
  NoFilesStaged = "No files staged"
}

async function isInsideWorkTree(): Promise<Result<boolean, unknown>> {
  const output = await Result.fromAsync(() => $`git rev-parse --is-inside-work-tree`.text());
  return output.map(v => v.trim() === "true");
}

export const git = {
  async currentBranch(): Promise<Option<string>> {
    const output = await Result.fromAsync(() => $`git branch --show-current`.text());
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
      () => $`git diff --cached --diff-algorithm=minimal --name-only`.text(),
      _err => GitError.NoFilesStaged,
    );
    return output
      .map(value => value.split("\n").filter(line => Boolean(line)))
      .andThen(v => v.length ? Ok(v) : Err(GitError.NoFilesStaged))
  },
  async diff(): Promise<Result<string, GitError>> {
    return await Result.fromAsync(
      () => $`git diff --cached --diff-algorithm=minimal`.text(),
      _err => GitError.NoFilesStaged
    )
  },
  async commit(message: string, noVerify = false): Promise<void> {
    console.log("\n");
    console.log(await $`git commit -m ${message} ${noVerify ? "--no-verify" : ""}`.text());
  }
}
