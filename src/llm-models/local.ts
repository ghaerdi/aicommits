import { AIC_SYSTEM_PROMPT, REVIEW_SYSTEM_PROMPT, type AICommits } from "./shared";
import ollama from 'ollama'

export type LocalLLM = {
  createModel(): Promise<void>;
}

export const aireview: LocalLLM = {
  async createModel() {
    await ollama.create({ model: 'codereview', from: "deepseek-coder-v2", system: REVIEW_SYSTEM_PROMPT });
  },
}

export const aicommits: LocalLLM = {
  async createModel() {
    await ollama.create({ model: 'aicommmits', from: "deepseek-coder-v2", system: AIC_SYSTEM_PROMPT });
  },
}

export const local: AICommits = {
  async messages(content: string, branch: string, generate: number) {
    const responses = [];
    for (let count = 0; count < generate; count++) {
      responses.push(await ollama.chat({
        model: 'aicommmits',
        messages: [{ role: "user", content: `currrent branch: ${branch}` }, { role: "user", content }],
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

