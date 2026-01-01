import {
  AIC_SYSTEM_PROMPT_REGULAR,
  AIC_SYSTEM_PROMPT_BRANCH,
  AIC_SYSTEM_PROMPT_ONCALL,
  AIC_SYSTEM_PROMPT_BRANCH_ONCALL,
  REVIEW_SYSTEM_PROMPT,
  type AICommits,
  type CommitContext
} from "./shared";
import { Result } from "@ghaerdi/rustify/result";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "../config";

const GEMINI_API_KEY: string = getGeminiApiKey();

const ai = Result.from(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }));

export const gemini: AICommits = {
  async messages(content: string, context: CommitContext, generate: number): Promise<string[]> {
    const gemini = ai.unwrap();

    // Select appropriate system prompt based on context.mode
    const systemPrompt = context.mode === 'branch-oncall' ? AIC_SYSTEM_PROMPT_BRANCH_ONCALL
                       : context.mode === 'oncall' ? AIC_SYSTEM_PROMPT_ONCALL
                       : context.mode === 'branch' ? AIC_SYSTEM_PROMPT_BRANCH
                       : AIC_SYSTEM_PROMPT_REGULAR;

    const responses = [];

    // Build contents array based on context
    const contents = [];
    if ((context.mode === 'branch' || context.mode === 'branch-oncall') && context.branchName) {
      contents.push(`current branch: ${context.branchName}`);
    }
    contents.push(content);

    for (let count = 0; count < generate; count++) {
      responses.push(await gemini.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: systemPrompt
        }
      }));
    }
    return [...new Set(responses.map(res => res.text?.trim()))].filter(v => typeof v === "string");
  },
  async *review(content: string) {
    const response = await ai.unwrap().models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [content],
      config: {
        systemInstruction: REVIEW_SYSTEM_PROMPT,
      }
    });
    for await (const chunk of response) {
      yield chunk.text as string
    }
  }
}
