import {
  AIC_SYSTEM_PROMPT_REGULAR,
  AIC_SYSTEM_PROMPT_BRANCH,
  AIC_SYSTEM_PROMPT_ONCALL,
  AIC_SYSTEM_PROMPT_BRANCH_ONCALL,
  REVIEW_SYSTEM_PROMPT,
  type AICommits,
  type CommitContext
} from "./shared";
import ollama from 'ollama'
import { spinner } from '@clack/prompts'

export type LocalLLM = {
  createModel(): Promise<void>;
}

async function ensureBaseModel() {
  const s = spinner();
  try {
    s.start("Checking base model: deepseek-coder-v2");
    const stream = await ollama.pull({ model: "deepseek-coder-v2", stream: true });

    for await (const chunk of stream) {
      if (chunk.completed && chunk.total) {
        const percent = ((chunk.completed / chunk.total) * 100).toFixed(1);
        const completed = (chunk.completed / 1024 / 1024).toFixed(1);
        const total = (chunk.total / 1024 / 1024).toFixed(1);
        s.message(`Downloading model: ${percent}% (${completed}MB / ${total}MB)`);
      }
    }
    s.stop("Base model ready");
  } catch (error) {
    s.stop("Model check completed");
  }
}

export const aireview: LocalLLM = {
  async createModel() {
    await ensureBaseModel();
    await ollama.create({ model: 'codereview', from: "deepseek-coder-v2", system: REVIEW_SYSTEM_PROMPT });
  },
}

export const aicommitsRegular: LocalLLM = {
  async createModel() {
    await ensureBaseModel();
    await ollama.create({ model: 'aicommits-regular', from: "deepseek-coder-v2", system: AIC_SYSTEM_PROMPT_REGULAR });
  },
}

export const aicommitsBranch: LocalLLM = {
  async createModel() {
    await ensureBaseModel();
    await ollama.create({ model: 'aicommits-branch', from: "deepseek-coder-v2", system: AIC_SYSTEM_PROMPT_BRANCH });
  },
}

export const aicommitsOncall: LocalLLM = {
  async createModel() {
    await ensureBaseModel();
    await ollama.create({ model: 'aicommits-oncall', from: "deepseek-coder-v2", system: AIC_SYSTEM_PROMPT_ONCALL });
  },
}

export const aicommitsBranchOncall: LocalLLM = {
  async createModel() {
    await ensureBaseModel();
    await ollama.create({ model: 'aicommits-branch-oncall', from: "deepseek-coder-v2", system: AIC_SYSTEM_PROMPT_BRANCH_ONCALL });
  },
}

export const local: AICommits = {
  async messages(content: string, context: CommitContext, generate: number) {
    // Determine which model to use based on context.mode
    const modelName = context.mode === 'branch-oncall' ? 'aicommits-branch-oncall'
                    : context.mode === 'oncall' ? 'aicommits-oncall'
                    : context.mode === 'branch' ? 'aicommits-branch'
                    : 'aicommits-regular';

    const responses = [];

    // Build user messages based on context
    const userMessages = [];
    if ((context.mode === 'branch' || context.mode === 'branch-oncall') && context.branchName) {
      userMessages.push({ role: "user", content: `current branch: ${context.branchName}` });
    }
    userMessages.push({ role: "user", content });

    for (let count = 0; count < generate; count++) {
      responses.push(await ollama.chat({
        model: modelName,
        messages: userMessages,
        options: { temperature: 1, num_predict: 30, tfs_z: 2, top_p: 0.5 }
      }));
    }
    return [...new Set(responses.map(res => res.message.content))];
  },
  async *review(content: string) {
    const message = { role: 'user', content }
    const response = await ollama.chat({ model: 'codereview', messages: [message], stream: true })
    for await (const part of response) {
      yield part.message.content;
    }
  }
}

