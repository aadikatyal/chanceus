#!/usr/bin/env node
/**
 * Dev start with a fresh .next/server graph (avoids missing chunk errors after HMR).
 */
import { spawn } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..")
const deepClean = process.argv.includes("--clean")
const skipClean = process.env.CHANCEUS_DEV_NO_CLEAN === "1"

if (existsSync(join(homedir(), "package-lock.json"))) {
  console.warn(
    "\n⚠️  ~/package-lock.json can make Next pick the wrong workspace root.\n" +
      "   Move or delete it if you see missing .next/server/*.js chunk errors.\n"
  )
}

if (!skipClean) {
  rmSync(join(appRoot, ".next"), { recursive: true, force: true })
  if (deepClean) {
    rmSync(join(appRoot, "node_modules", ".cache"), { recursive: true, force: true })
    console.log("Cleaned .next and node_modules/.cache.\n")
  } else {
    console.log("Cleaned .next for a fresh dev compile.\n")
  }
}

const child = spawn("pnpm", ["exec", "next", "dev"], {
  cwd: appRoot,
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code) => process.exit(code ?? 0))
