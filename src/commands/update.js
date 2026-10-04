import { execSync } from "child_process";
import fs from "fs";
import pc from "picocolors";
import { createPrompter } from "../core/wizard/prompts.js";
import { fileURLToPath } from "url";
import path from "path";

export async function runUpdate({ yes }) {
  const pkgUrl = new URL("../../package.json", import.meta.url);
  const pkg = JSON.parse(fs.readFileSync(fileURLToPath(pkgUrl), "utf-8"));
  const currentVersion = pkg.version;
  
  console.log(`Checking for updates... (current: ${currentVersion})`);
  
  let latestVersion;
  try {
    latestVersion = execSync("npm view agentic-agnostic-kit version", { stdio: ["pipe", "pipe", "ignore"], encoding: "utf-8" }).trim();
  } catch (err) {
    console.error(pc.red("Error: Could not check the latest version on npm registry."));
    process.exitCode = 1;
    return;
  }

  if (latestVersion === currentVersion) {
    console.log(pc.green(`\nYou are already using the latest version (${currentVersion}).`));
    return;
  }

  console.log(`\nA new version is available: ${pc.yellow(currentVersion)} -> ${pc.green(latestVersion)}`);
  
  const prompter = createPrompter();
  let proceed = yes;
  
  if (!proceed) {
    proceed = await prompter.confirm("Do you want to install it now?");
  }
  
  prompter.close();

  if (proceed) {
    console.log("\nInstalling latest version...");
    try {
      execSync("npm install -g agentic-agnostic-kit@latest", { stdio: "inherit" });
      console.log(pc.green("\nUpdate completed successfully!"));
      console.log(`Run ${pc.cyan("agentic-agnostic doctor")} to check your installation state.`);
      console.log(`Run ${pc.cyan("agentic-agnostic init")} to apply any new hook/stub capabilities.`);
    } catch (err) {
      console.error(pc.red("\nFailed to update."));
      process.exitCode = 1;
    }
  } else {
    console.log("\nUpdate cancelled. Run " + pc.cyan("npm install -g agentic-agnostic-kit@latest") + " to update manually later.");
  }
}
