import { Option } from "@ghaerdi/rustify/option";
import { Result } from "@ghaerdi/rustify/result";

type Config = {
  GEMINI_API_KEY?: string;
}

const CONFIG_PATH = `${process.env.HOME}/.aicommits.json`;

function readConfigFile(): Config {
  return Result.from(() => {
    const fs = require('fs');
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configContent) as Config;
  }).unwrapOrElse(error => {
    console.error(`Config file ${CONFIG_PATH} doesn't exists.`);
    console.warn("Create the config file");
    throw error;
  });
}

export function getGeminiApiKey(): string {
  const config = readConfigFile();
  return Option.fromNullable(() => config.GEMINI_API_KEY).unwrapOrElse(() => {
    throw `Add your GEMINI_API_KEY to ${CONFIG_PATH}`;
  })
}
