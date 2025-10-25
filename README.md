# aicommits

AI-powered git commit message generator that creates meaningful commit messages based on your staged changes.

## Features

- 🤖 AI-generated commit messages using Gemini or local models
- 📝 Code review functionality 
- 🌿 Branch-aware commit prefixing
- 🚨 On-call mode for emergency commits
- 🎯 Multiple commit message options to choose from
- ⚡ Fast execution with Bun runtime

## Installation

### NPM/Bun (Global)
```bash
npm install -g @ghaerdi/aicommits
# or
bun install -g @ghaerdi/aicommits
```

### Run without installing
```bash
npx @ghaerdi/aicommits
# or
bunx @ghaerdi/aicommits
```

### Nix
```bash
# Run once
nix run github:ghaerdi/aicommits

# Or install in shell
nix shell github:ghaerdi/aicommits
```

## Usage

After staging your changes with `git add`, run:

```bash
aicommit
```

### Command Line Options

- `--no-verify`, `-n`: Skip git pre-commit hooks
- `--review`, `-r`: Enable code review mode
- `--local`, `-l`: Use local AI models instead of Gemini
- `--oncall`: Enable on-call mode (adds oncall/ prefix)
- `--branch`, `-b`: Include branch name in commit message
- `--generate <number>`, `-g <number>`: Generate specific number of commit options (default: 4)

### Examples

Generate commit with code review:
```bash
aicommit --review
```

Use local models with 6 commit options:
```bash
aicommit --local --generate 6
```

On-call commit with branch prefix:
```bash
aicommit --oncall --branch
```

## Requirements

- Git repository with staged changes
- Node.js or Bun runtime
