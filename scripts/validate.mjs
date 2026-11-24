#!/usr/bin/env node
// Structure check for the Joylo Cursor plugin.
// Adapted from lovablelabs/lovable-cursor-plugin scripts/validate-template.mjs and
// cursor/plugin-template for a single plugin at the repo root (like replit/replit-cursor-plugin).
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

const PROD_MCP_URL = "https://api.joylo.ai/mcp";
const PROD_HOME = "https://joylo.ai";
const PROD_AUTH = "https://auth.joylo.ai";
// Staging registrable domain. Split so this file does not contain the host as one string.
const STAGING_DOMAIN = "joylo" + ".org";

// Fields documented for .cursor-plugin/plugin.json, plus displayName.
// displayName is not in the reference table, but cursor/plugin-template and the
// listed Replit and Lovable plugins all set it, and the marketplace uses it as the title.
// publisher and category are not plugin manifest fields (category exists only on
// multi-plugin marketplace entries).
const MANIFEST_KEYS = new Set([
  "name", "displayName", "version", "description", "author", "homepage", "repository",
  "license", "keywords", "logo", "rules", "agents", "skills", "commands", "hooks",
  "mcpServers", "variables",
]);

// Public Joylo URLs checked against real page content (joylo.ai returns 200 for unknown paths).
const VERIFIED_JOYLO_URLS = new Set([
  "https://joylo.ai",
  "https://joylo.ai/",
  "https://joylo.ai/privacy",
  "https://joylo.ai/terms-of-service",
  "https://joylo.ai/help",
  "https://joylo.ai/help/articles/how-credits-work",
  "https://joylo.ai/contact",
  "https://joylo.ai/secure",
  "https://api.joylo.ai/mcp",
  "https://auth.joylo.ai",
]);

// Tools exposed by the production Joylo MCP server.
const JOYLO_TOOLS = new Set([
  "whoami", "get_credit_balance", "list_projects", "get_project", "create_project",
  "get_build_status", "wait_for_build", "answer_questions", "stop_build", "send_followup",
  "ask_question", "get_latest_reply", "list_files", "read_file", "get_preview",
  "wake_project", "get_publish_quote", "publish_app", "get_app_url",
  "update_published_app", "stop_published_app",
]);

const YES_BEFORE_CALL = /wait for (?:a |the user's )?(?:clear )?yes/i;

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
    let entries;
    try { entries = await fs.readdir(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === ".git" || e.name === "node_modules") continue;
        stack.push(p);
      } else if (e.isFile()) out.push(p);
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

function checkSafetyLanguage(rel, body) {
  const mentions = (tool) => body.includes("`" + tool + "`");
  if (mentions("create_project") || mentions("send_followup") || mentions("ask_question")) {
    if (!/credit/i.test(body)) addError(`${rel}: mentions a credit-spending tool but never says it spends credits.`);
    if (!YES_BEFORE_CALL.test(body)) addError(`${rel}: mentions a credit-spending tool but does not require a yes before the call.`);
  }
  if (mentions("ask_question") && !/no `confirm_credits`/i.test(body)) {
    addError(`${rel}: mentions ask_question but does not say it has no confirm_credits gate. It spends credits immediately.`);
  }
  if (mentions("publish_app")) {
    if (!body.includes("confirm_credits")) addError(`${rel}: mentions publish_app but not confirm_credits.`);
    if (!YES_BEFORE_CALL.test(body)) addError(`${rel}: mentions publish_app but does not require a yes before publishing.`);
  }
  if (mentions("answer_questions") && !/only (?:with )?(?:their|the user's) answers|never pick an option/i.test(body)) {
    addError(`${rel}: mentions answer_questions but does not say to send only the user's answers.`);
  }
}

function joyloUrlsIn(text) {
  const found = [];
  const re = /https:\/\/(?:(?:api|auth)\.)?joylo\.ai[^\s)"'<>`]*/gi;
  for (const m of text.matchAll(re)) {
    found.push(m[0].replace(/[.,;:]+$/g, ""));
  }
  return found;
}

async function main() {
  // 1. Manifest
  const manifest = await readJson(path.join(repoRoot, ".cursor-plugin", "plugin.json"), "Plugin manifest");
  if (manifest) {
    for (const key of Object.keys(manifest)) {
      if (!MANIFEST_KEYS.has(key)) {
        addError(`plugin.json "${key}" is not a Cursor plugin manifest field. The current schema has no "publisher" or "category".`);
      }
    }
    if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
      addError('plugin.json "name" must be lowercase kebab-case (alphanumerics, hyphens, periods).');
    }
    if (manifest.displayName !== undefined && (typeof manifest.displayName !== "string" || !manifest.displayName.trim())) {
      addError('plugin.json "displayName" must be a non-empty string when set.');
    }
    if (!manifest.description || String(manifest.description).trim().length < 40) {
      addError('plugin.json "description" is required and should say what the plugin does.');
    }
    if (!manifest.version || !semverPattern.test(manifest.version)) addError('plugin.json "version" must be semver.');
    if (!manifest.author || typeof manifest.author !== "object" || !manifest.author.name) {
      addError('plugin.json "author.name" is required.');
    } else if (!manifest.author.email) {
      addWarning('plugin.json author.email is unset. Lovable sets one; add a real Joylo address if you want it on the listing.');
    } else if (typeof manifest.author.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manifest.author.email)) {
      addError('plugin.json "author.email" is not a valid email address.');
    }
    if (manifest.homepage !== PROD_HOME) addError(`plugin.json "homepage" must be ${PROD_HOME}.`);
    if (manifest.repository !== "https://github.com/Joylo-AI/joylo-cursor-plugin") {
      addWarning(`plugin.json "repository" is ${manifest.repository}; make sure it is the public repo.`);
    }
    if (manifest.license !== "MIT") addError('plugin.json "license" must be MIT, matching LICENSE.');
    if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0 || manifest.keywords.some((k) => typeof k !== "string" || !k.trim())) {
      addError('plugin.json "keywords" must be a non-empty array of strings.');
    }
    if (!manifest.logo) addError('plugin.json "logo" is required so the marketplace listing has an icon.');
    for (const field of ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"]) {
      const vals = [manifest[field]].flat().filter((v) => typeof v === "string");
      for (const v of vals) {
        if (/^https?:\/\//.test(v)) continue;
        if (!isSafeRelativePath(v)) addError(`plugin.json "${field}" has unsafe path "${v}".`);
        else if (!(await pathExists(path.resolve(repoRoot, v)))) addError(`plugin.json "${field}" references missing path "${v}".`);
      }
    }
  }

  // 2. Logo
  const logoPath = path.join(repoRoot, manifest?.logo ?? "assets/logo.svg");
  if (!(await pathExists(logoPath))) {
    addError(`Logo file is missing: ${path.relative(repoRoot, logoPath)}`);
  } else {
    const svg = await fs.readFile(logoPath, "utf8");
    if (!svg.includes("<svg")) addError(`${path.relative(repoRoot, logoPath)} is not an SVG.`);
    if (/PLACEHOLDER/i.test(svg)) addError(`${path.relative(repoRoot, logoPath)} is still a placeholder logo.`);
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
          if (cfg.url !== PROD_MCP_URL) addError(`mcp.json server "${name}" url must be ${PROD_MCP_URL}.`);
          if (cfg.type !== "http") addError(`mcp.json server "${name}" type must be "http" (Streamable HTTP).`);
        }
        if (cfg.headers) addError(`mcp.json server "${name}" has "headers"; sign-in is OAuth, so no keys or headers belong in the plugin.`);
        if (cfg.env) addError(`mcp.json server "${name}" has "env"; no secrets belong in the plugin.`);
        if (cfg.auth) addError(`mcp.json server "${name}" has "auth"; Joylo uses OAuth discovery, not a baked-in client id.`);
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
        if (parsed.fields.name && !pluginNamePattern.test(parsed.fields.name)) addError(`${rel}: skill name must be lowercase kebab-case.`);
      }
      if (parsed.fields.name) {
        const key = `${kind}:${parsed.fields.name}`;
        if (seen.has(key)) addError(`Duplicate ${kind} name "${parsed.fields.name}" in ${rel} and ${seen.get(key)}.`);
        seen.set(key, rel);
      }
      checkToolMentions(rel, parsed.body);
      checkSafetyLanguage(rel, parsed.body);
    }
  }

  // 5. Required docs
  for (const f of ["README.md", "LICENSE", "SECURITY.md", "CHANGELOG.md"]) {
    if (!(await pathExists(path.join(repoRoot, f)))) addError(`${f} is missing.`);
  }
  if (await pathExists(path.join(repoRoot, "LICENSE"))) {
    const license = await fs.readFile(path.join(repoRoot, "LICENSE"), "utf8");
    if (!/MIT License/.test(license)) addError("LICENSE does not look like the MIT license named in plugin.json.");
  }
  if (await pathExists(path.join(repoRoot, "README.md"))) {
    const readme = await fs.readFile(path.join(repoRoot, "README.md"), "utf8");
    if (/Before submitting/.test(readme)) addError('README.md still has a "Before submitting" checklist. Put maintainer-only leftovers in the PR, not the listing README.');
    if (/PLACEHOLDER/i.test(readme)) addError("README.md still mentions a placeholder.");
    if (!/^## Sign-in/m.test(readme)) addError('README.md needs a "Sign-in" section.');
    if (!/credit/i.test(readme)) addError("README.md must explain credit spending.");
    if (!YES_BEFORE_CALL.test(readme)) addError("README.md must say the agent waits for a yes before spending credits.");
    if (!/no `confirm_credits`/i.test(readme)) addError("README.md must say ask_question has no confirm_credits gate.");
    if (!/Build me a Joylo app/.test(readme)) addError("README.md needs an example prompt.");
    for (const url of [PROD_HOME + "/privacy", PROD_HOME + "/terms-of-service", PROD_HOME + "/help", PROD_HOME + "/secure", PROD_HOME + "/contact", PROD_MCP_URL, PROD_AUTH]) {
      if (!readme.includes(url)) addError(`README.md is missing ${url}.`);
    }
    for (const tool of JOYLO_TOOLS) {
      if (!readme.includes("`" + tool + "`")) addError(`README.md does not document \`${tool}\`.`);
    }
  }

  // 6. Whole-repo checks: staging hosts, unverified Joylo links, secrets
  for (const f of await walk(repoRoot)) {
    const rel = path.relative(repoRoot, f);
    if (rel.toLowerCase().includes(STAGING_DOMAIN)) addError(`${rel}: path contains the staging domain.`);
    if (/(^|\/)\.env(\.|$)|\.pem$|\.key$/.test(rel)) addError(`Secret-looking file should not be in the plugin: ${rel}`);
    let text;
    try { text = await fs.readFile(f, "utf8"); } catch { continue; }
    if (text.toLowerCase().includes(STAGING_DOMAIN)) addError(`${rel}: mentions the staging domain (${STAGING_DOMAIN}). Production is joylo.ai.`);
    if (/https?:\/\/(?:localhost|127\.0\.0\.1)\b/i.test(text)) addError(`${rel}: contains a localhost URL.`);
    if (/http:\/\/(?:(?:api|auth)\.)?joylo\.ai/i.test(text)) addError(`${rel}: uses http:// for a Joylo host. Use https.`);
    for (const url of joyloUrlsIn(text)) {
      if (!VERIFIED_JOYLO_URLS.has(url)) addError(`${rel}: Joylo URL is not on the verified list: ${url}`);
    }
  }

  if (warnings.length) { console.log("Warnings:"); for (const w of warnings) console.log(`- ${w}`); console.log(""); }
  if (errors.length) { console.error("Validation failed:"); for (const e of errors) console.error(`- ${e}`); process.exit(1); }
  console.log("Validation passed.");
}

await main();
