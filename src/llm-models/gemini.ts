import { AIC_SYSTEM_PROMPT, REVIEW_SYSTEM_PROMPT, type AICommits } from "./shared";
import { Result } from "@ghaerdi/rustify/result";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "../config";

const GEMINI_API_KEY: string = getGeminiApiKey();

const ai = Result.from(() => new GoogleGenAI({ apiKey: GEMINI_API_KEY }));

export const gemini: AICommits = {
  async messages(content: string, branch: string, generate: number): Promise<string[]> {
    const gemini = ai.unwrap();
    const responses = [];
    for (let count = 0; count < generate; count++) {
      responses.push(await gemini.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [`current branch: ${branch}`, content],
        config: {
          systemInstruction: AIC_SYSTEM_PROMPT
        }
      }));
    }
    return [...new Set(responses.map(res => res.text?.trim()))].filter(v => typeof v === "string");
  },
  async *review(content: string) {
    const response = await ai.unwrap().models.generateContentStream({
      model: "gemini-2.0-flash-lite",
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
