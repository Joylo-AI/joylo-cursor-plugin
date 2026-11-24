#!/usr/bin/env node
// Structure check for the Joylo Cursor plugin.
// Adapted from lovablelabs/lovable-cursor-plugin scripts/validate-template.mjs for a
// single plugin at the repo root (like replit/replit-cursor-plugin).
// Usage: node scripts/validate.mjs   (run from the repo root)

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];
const addError = (m) => errors.push(m);
const addWarning = (m) => warnings.push(m);

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// Production values. Anything else is flagged as a URL to change before submitting.
const PROD_MCP_URL = "https://api.joylo.org/mcp";
const KNOWN_PLACEHOLDERS = [
  "api-test.joylo.org",
  "auth-test.joylo.org",
  "dev.joylo.org",
  "test.joylo.org",
  "localhost",
];

// Tools exposed by the Joylo MCP server (from its live tool list).
const JOYLO_TOOLS = new Set([
  "whoami", "get_credit_balance", "list_projects", "get_project", "create_project",
  "get_build_status", "wait_for_build", "answer_questions", "stop_build", "send_followup",
  "ask_question", "get_latest_reply", "list_files", "read_file", "get_preview",
  "wake_project", "get_publish_quote", "publish_app", "get_app_url",
  "update_published_app", "stop_published_app",
]);

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJson(p, ctx) {
  let raw;
  try { raw = await fs.readFile(p, "utf8"); } catch { addError(`${ctx} is missing: ${path.relative(repoRoot, p)}`); return null; }
  try { return JSON.parse(raw); } catch (e) { addError(`${ctx} has invalid JSON: ${e.message}`); return null; }
}

function parseFrontmatter(content) {
  const n = content.replace(/\r\n/g, "\n");
  if (!n.startsWith("---\n")) return null;
  const end = n.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of n.slice(4, end).split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fields, body: n.slice(end + 5) };
}

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of await fs.readdir(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function isSafeRelativePath(v) {
  if (typeof v !== "string" || !v) return false;
  if (/^https?:\/\//.test(v)) return true;
  if (path.isAbsolute(v)) return false;
  const n = path.posix.normalize(v.replace(/\\/g, "/"));
  return !n.startsWith("../") && n !== "..";
}

function checkToolMentions(rel, body) {
  // Backticked snake_case names that look like Joylo tools must exist on the server.
  const toolish = /`([a-z]+(?:_[a-z]+)+)`/g;
  const params = new Set([
    "project_id", "app_type", "idempotency_key", "timeout_seconds", "login_choice",
    "input_kind", "phase_plan", "workspace_id", "next_offset", "credits_required",
    "period_days", "includes_database", "confirm_credits", "app_name", "project_name",
    "update_in_progress", "seamless_sso", "own_keys", "needs_input", "elapsed_seconds",
  ]);
  for (const m of body.matchAll(toolish)) {
    const name = m[1];
    if (params.has(name) || name.includes("joylo")) continue;
    if (!JOYLO_TOOLS.has(name)) addError(`${rel}: mentions \`${name}\`, which is not a Joylo MCP tool or known parameter.`);
  }
}

async function main() {
  // 1. Manifest
  const manifest = await readJson(path.join(repoRoot, ".cursor-plugin", "plugin.json"), "Plugin manifest");
  if (manifest) {
    if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
      addError('plugin.json "name" must be lowercase kebab-case (alphanumerics, hyphens, periods).');
    }
    if (!manifest.description) addError('plugin.json "description" is required for submission.');
    if (manifest.version && !semverPattern.test(manifest.version)) addError('plugin.json "version" must be semver.');
    if (!manifest.author || !manifest.author.name) addError('plugin.json "author.name" is required.');
    for (const f of ["homepage", "repository", "license", "keywords", "logo"]) {
      if (manifest[f] === undefined) addWarning(`plugin.json has no "${f}".`);
    }
    for (const field of ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"]) {
      const vals = [manifest[field]].flat().filter((v) => typeof v === "string");
      for (const v of vals) {
        if (/^https?:\/\//.test(v)) continue;
        if (!isSafeRelativePath(v)) addError(`plugin.json "${field}" has unsafe path "${v}".`);
        else if (!(await pathExists(path.resolve(repoRoot, v)))) addError(`plugin.json "${field}" references missing path "${v}".`);
      }
    }
    if (manifest.repository && manifest.repository !== "https://github.com/Joylo-AI/joylo-cursor-plugin") {
      addWarning(`plugin.json "repository" is ${manifest.repository}; make sure it is the public repo.`);
    }
  }

  // 2. Logo
  const logoPath = path.join(repoRoot, manifest?.logo ?? "assets/logo.svg");
  if (await pathExists(logoPath)) {
    const svg = await fs.readFile(logoPath, "utf8");
    if (/PLACEHOLDER/i.test(svg)) addWarning(`${path.relative(repoRoot, logoPath)} is a placeholder; replace it with the official logo before submitting.`);
  }

  // 3. MCP config
  const mcp = await readJson(path.join(repoRoot, "mcp.json"), "mcp.json");
  if (mcp) {
    const servers = mcp.mcpServers;
    if (!servers || typeof servers !== "object" || !Object.keys(servers).length) {
      addError('mcp.json must define at least one server under "mcpServers".');
    } else {
      for (const [name, cfg] of Object.entries(servers)) {
        if (!pluginNamePattern.test(name)) addError(`mcp.json server "${name}" should be lowercase kebab-case.`);
        if (!cfg.url && !cfg.command) addError(`mcp.json server "${name}" needs "url" or "command".`);
        if (cfg.url) {
          if (!cfg.url.startsWith("https://")) addError(`mcp.json server "${name}" url must be https.`);
          if (cfg.type && !["http", "streamable-http", "sse"].includes(cfg.type)) addError(`mcp.json server "${name}" has unexpected type "${cfg.type}".`);
          if (KNOWN_PLACEHOLDERS.some((h) => cfg.url.includes(h))) addWarning(`mcp.json server "${name}" points at a non-production host (${cfg.url}).`);
          else if (cfg.url !== PROD_MCP_URL) addWarning(`mcp.json server "${name}" url (${cfg.url}) differs from the expected production URL ${PROD_MCP_URL}.`);
        }
        if (cfg.headers) addError(`mcp.json server "${name}" has "headers"; sign-in is OAuth, so no keys or headers belong in the plugin.`);
        if (cfg.env) addError(`mcp.json server "${name}" has "env"; no secrets belong in the plugin.`);
        const raw = JSON.stringify(cfg);
        for (const m of raw.matchAll(/\$\{([A-Z0-9_]+)\}/g)) {
          if (!manifest?.variables || !JSON.stringify(manifest.variables).includes(m[1])) {
            addError(`mcp.json uses \${${m[1]}} but plugin.json does not declare it under "variables".`);
          }
        }
      }
    }
  }

  // 4. Components and frontmatter
  const components = [
    ["rules", "rule", [".md", ".mdc", ".markdown"], ["description"]],
    ["skills", "skill", null, ["name", "description"]],
    ["agents", "agent", [".md", ".mdc", ".markdown"], ["name", "description"]],
    ["commands", "command", [".md", ".mdc", ".markdown", ".txt"], ["name", "description"]],
  ];
  const seen = new Map();
  for (const [dir, kind, exts, keys] of components) {
    const abs = path.join(repoRoot, dir);
    if (!(await pathExists(abs))) continue;
    for (const file of await walk(abs)) {
      const isTarget = exts ? exts.includes(path.extname(file).toLowerCase()) : path.basename(file) === "SKILL.md";
      if (!isTarget) continue;
      const rel = path.relative(repoRoot, file);
      const parsed = parseFrontmatter(await fs.readFile(file, "utf8"));
      if (!parsed) { addError(`${kind} file missing YAML frontmatter: ${rel}`); continue; }
      for (const k of keys) if (!parsed.fields[k]) addError(`${kind} file missing "${k}" in frontmatter: ${rel}`);
      if (kind === "skill") {
        const folder = path.basename(path.dirname(file));
        if (parsed.fields.name && parsed.fields.name !== folder) addWarning(`${rel}: skill name "${parsed.fields.name}" differs from its folder "${folder}".`);
      }
      if (parsed.fields.name) {
        const key = `${kind}:${parsed.fields.name}`;
        if (seen.has(key)) addError(`Duplicate ${kind} name "${parsed.fields.name}" in ${rel} and ${seen.get(key)}.`);
        seen.set(key, rel);
      }
      checkToolMentions(rel, parsed.body);
    }
  }

  // 5. Required docs
  for (const f of ["README.md", "LICENSE"]) {
    if (!(await pathExists(path.join(repoRoot, f)))) addError(`${f} is missing.`);
  }
  if (await pathExists(path.join(repoRoot, "README.md"))) {
    const readme = await fs.readFile(path.join(repoRoot, "README.md"), "utf8");
    if (!/Before submitting/.test(readme)) addWarning('README.md has no "Before submitting" section.');
    else addWarning('README.md still has a "Before submitting" checklist; finish it and trim it before submitting.');
  }

  // 6. Stray files that should never be committed
  for (const f of await walk(repoRoot)) {
    const rel = path.relative(repoRoot, f);
    if (rel.startsWith(".git" + path.sep)) continue;
    if (/(^|\/)\.env(\.|$)|\.pem$|\.key$/.test(rel)) addError(`Secret-looking file should not be in the plugin: ${rel}`);
  }

  if (warnings.length) { console.log("Warnings:"); for (const w of warnings) console.log(`- ${w}`); console.log(""); }
  if (errors.length) { console.error("Validation failed:"); for (const e of errors) console.error(`- ${e}`); process.exit(1); }
  console.log("Validation passed.");
}

await main();
