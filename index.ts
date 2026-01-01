#!/usr/bin/env node
import { select, spinner, confirm, isCancel } from "@clack/prompts";
import { aicommitsRegular, aicommitsBranch, aicommitsOncall, aicommitsBranchOncall, aireview, local } from "./src/llm-models/local";
import { gemini } from "./src/llm-models/gemini";
import { git } from "./src/git";
import type { CommitContext } from "./src/llm-models/shared";

const FLAGS = {
  help: ["--help", "-h"],
  noVerify: ["--no-verify", "-n"],
  review: ["--review", "-r"],
  local: ["--local", "-l"],
  oncall: ["--oncall"],
  branch: ["--branch", "-b"],
  generate: ["--generate", "-g"],
}

if (import.meta.main) {
  // Check for help flag first
  if (process.argv.some(v => FLAGS.help.some(f => f === v))) {
    console.log(`aicommit - AI-powered git commit message generator

Usage: aicommit [options]

Options:
  -h, --help         Show this help message
  -n, --no-verify    Skip git pre-commit hooks
  -r, --review       Review code changes with AI
  -l, --local        Use local AI model instead of Gemini
  --oncall           Mark as oncall commit
  -b, --branch       Include branch name in commit
  -g, --generate <n> Generate <n> commit messages (default: 4)

Examples:
  aicommit                    Generate commit messages
  aicommit -r                 Review code and generate commits
  aicommit -l                 Use local AI model
  aicommit -g 6               Generate 6 commit messages
  aicommit --oncall -b        Oncall commit with branch name`);
    process.exit(0);
  }

  const config = {
    gitNoVerify: process.argv.some(v => FLAGS.noVerify.some(f => f === v)),
    review: process.argv.some(v => FLAGS.review.some(f => f === v)),
    local: process.argv.some(v => FLAGS.local.some(f => f === v)),
    oncall: process.argv.some(v => FLAGS.oncall.some(f => f === v)),
    branch: process.argv.some(v => FLAGS.branch.some(f => f === v)),
    generate: (() => {
      const index = process.argv.findLastIndex(v => FLAGS.generate.some(f => f === v)) + 1;
      return Number(process.argv[index]) || 4;
    })()
  };

  // Check if git is initialized
  (await git.checkInit()).unwrapOrElse(err => {
    console.error(err);
    process.exit();
  });

  const _spinner = spinner()

  // Create local models
  if (config.local && config.review) {
    _spinner.start("Initializing local review model (may download if not cached)");
    await aireview.createModel();
    _spinner.stop("Local review model ready");
  }
  if (config.local) {
    _spinner.start("Initializing local commit model (may download if not cached)");
    // Create appropriate model based on flags
    if (config.oncall && config.branch) {
      await aicommitsBranchOncall.createModel();
    } else if (config.oncall) {
      await aicommitsOncall.createModel();
    } else if (config.branch) {
      await aicommitsBranch.createModel();
    } else {
      await aicommitsRegular.createModel();
    }
    _spinner.stop("Local commit model ready");
  }

  _spinner.start("Spying your files");

  const diff = (await git.diff()).unwrapOrElse(err => {
    console.error(err);
    process.exit();
  })
  const files = (await git.files()).unwrapOrElse(err => {
    console.error(err);
    process.exit();
  });
  _spinner.stop(`${files.length} files in stage\n    ${files.join("\n    ")}`);
  if (config.oncall) {
    config.oncall = await confirm({ message: "Is oncall?", initialValue: true }) as boolean;
  }

  let branchName: string | undefined = undefined;
  if (config.branch || config.oncall) {
    const branchOption = await git.currentBranch();
    branchName = branchOption.unwrapOr(undefined);
  }

  // Build CommitContext based on flag combination
  const commitContext: CommitContext = {
    mode: config.oncall && config.branch ? 'branch-oncall'
        : config.oncall ? 'oncall'
        : config.branch ? 'branch'
        : 'regular',
    branchName
  };

  const model = config.local ? local : gemini;
  const commitsPromise = model.messages(diff, commitContext, config.generate) // process.exit if git.diff is empty string

  if (config.review) {
    _spinner.start("Grab some coffee while I'm reading your code")
    let isWritting = false;
    for await (const part of model.review(diff)) {
      if (!isWritting) _spinner.stop("Best code I've ever seen")
      console.info(part);
      isWritting = true;
    }
    console.log("\n");
  }

  _spinner.start("Braining your commit")
  const commits = await commitsPromise;
  _spinner.stop("Are you seriously commiting this?")

  if (commits.length > 1) {
    const message = await select({
      message: "Choose a commit message (Ctrl+c to exit)",
      options: commits.map(value => ({ label: value, value })),
    })
    if (isCancel(message)) {
      process.exit();
    }
    git.commit(message as string, config.gitNoVerify);
  } else {
    const message = commits[0];
    const confirmed = await confirm({ message: `Use this commit?\n\n    ${message}`, initialValue: false });
    if (isCancel(confirmed) || !confirmed) {
      process.exit();
    }
    git.commit(message, config.gitNoVerify);
  }
}
