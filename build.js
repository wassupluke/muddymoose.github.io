#!/usr/bin/env node
/* eslint-disable no-console */
//
// Renders index.html, styles.css, and script.js from content.yaml +
// templates/*.hbs. Runs on every push to main via GitHub Actions; can
// also be run locally with `pnpm run build`.
//
// If content.yaml is malformed or missing required fields, this exits
// non-zero without touching the generated files — the old site stays live.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const yaml = require("js-yaml");
const Handlebars = require("handlebars");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const schema = require("./schema");

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, "content.yaml");
const TEMPLATES_DIR = path.join(ROOT, "templates");

const AUTOGEN_HTML = "<!-- AUTO-GENERATED from content.yaml. Do not edit directly — edit content.yaml and run `pnpm run build`. -->";
const AUTOGEN_CSS  = "/* AUTO-GENERATED from content.yaml. Do not edit directly — edit content.yaml and run `pnpm run build`. */";
const AUTOGEN_JS   = "// AUTO-GENERATED from content.yaml. Do not edit directly — edit content.yaml and run `pnpm run build`.";

function die(msg) {
  console.error(`\n✗ Build failed: ${msg}\n`);
  process.exit(1);
}

// ─── Load + parse content.yaml ─────────────────────────────────────────
let rawYaml;
try {
  rawYaml = fs.readFileSync(CONFIG_PATH, "utf8");
} catch (err) {
  die(`could not read content.yaml (${err.message})`);
}

let config;
try {
  config = yaml.load(rawYaml);
} catch (err) {
  die(`content.yaml has a YAML syntax error:\n  ${err.message}`);
}

// Normalize any Date objects js-yaml auto-parsed back into "YYYY-MM-DD"
// strings so the schema and templates see them uniformly.
config = JSON.parse(
  JSON.stringify(config, (_k, v) =>
    v instanceof Date ? v.toISOString().split("T")[0] : v,
  ),
);

// ─── Validate against schema ───────────────────────────────────────────
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(config)) {
  const messages = validate.errors.map((e) => {
    const where = e.instancePath || "(root)";
    const params = Object.keys(e.params || {}).length
      ? ` [${JSON.stringify(e.params)}]`
      : "";
    return `  • at ${where}: ${e.message}${params}`;
  });
  die(
    `content.yaml did not match the expected shape:\n${messages.join("\n")}\n`,
  );
}

// ─── Handlebars helpers ────────────────────────────────────────────────
Handlebars.registerHelper("json", (ctx) => new Handlebars.SafeString(JSON.stringify(ctx)));
Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper("rgba", (hex, alpha) => {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "";
  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return new Handlebars.SafeString(`rgb(${r}, ${g}, ${b}, ${alpha})`);
});

function parseISODate(s) {
  // Treat YYYY-MM-DD as noon UTC so local timezone shifts don't drop the day.
  return new Date(`${s}T12:00:00Z`);
}

function ordinal(n) {
  if (n >= 11 && n <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
}

Handlebars.registerHelper("formatDeadlineShort", (d) => {
  if (!d) return "";
  const date = parseISODate(d);
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const day = date.getUTCDate();
  return new Handlebars.SafeString(`${month} ${day}${ordinal(day)}`);
});

Handlebars.registerHelper("formatPickupRange", (days) => {
  if (!Array.isArray(days) || days.length === 0) return "";
  const first = parseISODate(days[0].date);
  const last = parseISODate(days[days.length - 1].date);
  const firstMonth = first.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const lastMonth = last.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  if (days.length === 1) {
    return new Handlebars.SafeString(`${firstMonth} ${first.getUTCDate()}`);
  }
  if (firstMonth === lastMonth) {
    return new Handlebars.SafeString(
      `${firstMonth} ${first.getUTCDate()}–${last.getUTCDate()}`,
    );
  }
  return new Handlebars.SafeString(
    `${firstMonth} ${first.getUTCDate()}–${lastMonth} ${last.getUTCDate()}`,
  );
});

Handlebars.registerHelper("formatPickupDaysAbbrev", (days) => {
  if (!Array.isArray(days) || days.length === 0) return "";
  return new Handlebars.SafeString(
    days
      .map((d) => {
        const date = parseISODate(d.date);
        const weekday = date.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" });
        const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
        return `${weekday} ${month} ${date.getUTCDate()}`;
      })
      .join(" or "),
  );
});

// ─── Render templates ──────────────────────────────────────────────────
function render(templateFile, data, header) {
  const src = fs.readFileSync(path.join(TEMPLATES_DIR, templateFile), "utf8");
  // CSS and JS should not HTML-escape their contents.
  const noEscape =
    templateFile.endsWith(".css.hbs") || templateFile.endsWith(".js.hbs");
  const compiled = Handlebars.compile(src, { noEscape });
  return `${header}\n${compiled(data)}`;
}

function shortHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

const cssOut = render("styles.css.hbs", config, AUTOGEN_CSS);
const jsOut = render("script.js.hbs", config, AUTOGEN_JS);

const cssHash = shortHash(cssOut);
const jsHash = shortHash(jsOut);

const htmlOut = render(
  "index.html.hbs",
  { ...config, cssHash, jsHash },
  AUTOGEN_HTML,
);

// ─── Write outputs ─────────────────────────────────────────────────────
const writes = [
  ["index.html", htmlOut],
  ["styles.css", cssOut],
  ["script.js", jsOut],
];

for (const [file, content] of writes) {
  fs.writeFileSync(path.join(ROOT, file), content);
}

console.log("✓ Built site from content.yaml");
console.log(`  styles.css  → v=${cssHash}  (${cssOut.length} bytes)`);
console.log(`  script.js   → v=${jsHash}  (${jsOut.length} bytes)`);
console.log(`  index.html  →           (${htmlOut.length} bytes)`);
