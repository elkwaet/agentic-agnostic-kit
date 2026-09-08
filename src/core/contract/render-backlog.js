import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "..", "templates", "project", "Backlog.md.tpl");

export async function renderBacklog() {
  return readFile(TEMPLATE_PATH, "utf8");
}
