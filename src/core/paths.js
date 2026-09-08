import { homedir } from "node:os";
import path from "node:path";

export function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  return p;
}

export function kitStateDir() {
  return path.join(homedir(), ".agents", ".agentic-agnostic-kit");
}

export function kitStateFile() {
  return path.join(kitStateDir(), "state.json");
}

export function kitBackupDir(scope, timestamp) {
  return path.join(kitStateDir(), "backups", scope, timestamp);
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}
