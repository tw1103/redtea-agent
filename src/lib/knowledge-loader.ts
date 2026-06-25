import { readFile } from "node:fs/promises";
import path from "node:path";

const files = ["business-methodology.md", "technology-selection-rules.md", "data-closed-loop.md", "governance-rules.md"];
export async function loadKnowledge() {
  const root = path.join(process.cwd(), "knowledge");
  return (await Promise.all(files.map(async (file) => `\n## ${file}\n${await readFile(path.join(root, file), "utf8")}`))).join("\n");
}
