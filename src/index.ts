#!/usr/bin/env node
/**
 * mcp-devkit — MCP server with 15 zero-config developer utilities.
 * Built by dpm (digital product mill). MIT License.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// ────────────────────────────────────────────────────────────────────
// Tool definitions (LLM-facing schema)
// ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "uuid",
    description: "Generate a UUID. Supports v4 (random) and v7 (time-ordered).",
    inputSchema: {
      type: "object",
      properties: {
        version: { type: "string", enum: ["v4", "v7"], default: "v4" },
        count: { type: "integer", minimum: 1, maximum: 100, default: 1 },
      },
    },
  },
  {
    name: "hash",
    description: "Compute hash digest. Supports md5, sha1, sha256, sha512.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Input text to hash" },
        algorithm: {
          type: "string",
          enum: ["md5", "sha1", "sha256", "sha512"],
          default: "sha256",
        },
        encoding: { type: "string", enum: ["hex", "base64"], default: "hex" },
      },
      required: ["text"],
    },
  },
  {
    name: "hmac",
    description: "Compute HMAC signature with secret key.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        secret: { type: "string" },
        algorithm: { type: "string", enum: ["sha1", "sha256", "sha512"], default: "sha256" },
      },
      required: ["text", "secret"],
    },
  },
  {
    name: "base64_encode",
    description: "Encode text to base64. URL-safe variant available.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        url_safe: { type: "boolean", default: false },
      },
      required: ["text"],
    },
  },
  {
    name: "base64_decode",
    description: "Decode base64 to text. Auto-detects URL-safe variant.",
    inputSchema: {
      type: "object",
      properties: { encoded: { type: "string" } },
      required: ["encoded"],
    },
  },
  {
    name: "url_encode",
    description: "Percent-encode a string per RFC 3986.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "url_decode",
    description: "Decode a percent-encoded string.",
    inputSchema: {
      type: "object",
      properties: { encoded: { type: "string" } },
      required: ["encoded"],
    },
  },
  {
    name: "jwt_decode",
    description:
      "Decode a JWT (header + payload). Does NOT verify signature unless secret is provided.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        secret: { type: "string", description: "Optional HMAC secret to verify" },
      },
      required: ["token"],
    },
  },
  {
    name: "json_format",
    description: "Pretty-print, minify, or sort-keys on JSON string.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        action: {
          type: "string",
          enum: ["pretty", "minify", "sort"],
          default: "pretty",
        },
        indent: { type: "integer", minimum: 0, maximum: 8, default: 2 },
      },
      required: ["text"],
    },
  },
  {
    name: "yaml_to_json",
    description: "Convert YAML string to JSON.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "json_to_yaml",
    description: "Convert JSON string to YAML.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "cron_explain",
    description: 'Explain a cron expression in plain English. E.g. "0 9 * * 1" → "At 9:00 AM every Monday".',
    inputSchema: {
      type: "object",
      properties: { expression: { type: "string" } },
      required: ["expression"],
    },
  },
  {
    name: "timestamp_convert",
    description: "Convert between Unix timestamp and ISO 8601 in any timezone.",
    inputSchema: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "Input value: Unix seconds, milliseconds, or ISO 8601 string",
        },
        to: { type: "string", enum: ["unix_s", "unix_ms", "iso"], default: "iso" },
        timezone: {
          type: "string",
          description: "IANA timezone, e.g. 'America/Toronto'. Defaults to UTC.",
          default: "UTC",
        },
      },
      required: ["value"],
    },
  },
  {
    name: "color_convert",
    description: "Convert between hex, rgb, and hsl color formats.",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "string", description: "e.g. '#ff5722', 'rgb(255,87,34)', 'hsl(14,100%,57%)'" },
        to: { type: "string", enum: ["hex", "rgb", "hsl", "all"], default: "all" },
      },
      required: ["value"],
    },
  },
  {
    name: "slugify",
    description: "Convert any string to a URL-safe slug.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        separator: { type: "string", default: "-" },
      },
      required: ["text"],
    },
  },
  {
    name: "password_generate",
    description: "Generate a cryptographically random password.",
    inputSchema: {
      type: "object",
      properties: {
        length: { type: "integer", minimum: 4, maximum: 128, default: 20 },
        uppercase: { type: "boolean", default: true },
        lowercase: { type: "boolean", default: true },
        digits: { type: "boolean", default: true },
        symbols: { type: "boolean", default: true },
      },
    },
  },
  {
    name: "lorem_ipsum",
    description: "Generate Lorem Ipsum placeholder text.",
    inputSchema: {
      type: "object",
      properties: {
        unit: { type: "string", enum: ["words", "sentences", "paragraphs"], default: "paragraphs" },
        count: { type: "integer", minimum: 1, maximum: 100, default: 3 },
      },
    },
  },
];

// ────────────────────────────────────────────────────────────────────
// Tool implementations
// ────────────────────────────────────────────────────────────────────

function uuidV7(): string {
  // RFC 9562 UUIDv7: 48-bit Unix ms timestamp + 74 bits random
  const ts = BigInt(Date.now());
  const tsHex = ts.toString(16).padStart(12, "0");
  const rand = randomBytes(10);
  rand[0] = (rand[0] & 0x0f) | 0x70; // version 7
  rand[2] = (rand[2] & 0x3f) | 0x80; // variant
  const randHex = rand.toString("hex");
  return `${tsHex.slice(0, 8)}-${tsHex.slice(8, 12)}-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 20)}`;
}

const tools: Record<string, (args: any) => any> = {
  uuid({ version = "v4", count = 1 }) {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      out.push(version === "v7" ? uuidV7() : randomUUID());
    }
    return { uuids: out };
  },

  hash({ text, algorithm = "sha256", encoding = "hex" }) {
    const digest = createHash(algorithm).update(text).digest(encoding as any);
    return { algorithm, encoding, digest };
  },

  hmac({ text, secret, algorithm = "sha256" }) {
    const digest = createHmac(algorithm, secret).update(text).digest("hex");
    return { algorithm, digest };
  },

  base64_encode({ text, url_safe = false }) {
    let encoded = Buffer.from(text, "utf8").toString("base64");
    if (url_safe) {
      encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    return { encoded };
  },

  base64_decode({ encoded }) {
    // Auto-detect URL-safe and re-pad
    let normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4 !== 0) normalized += "=";
    const text = Buffer.from(normalized, "base64").toString("utf8");
    return { text };
  },

  url_encode({ text }) {
    return { encoded: encodeURIComponent(text) };
  },

  url_decode({ encoded }) {
    return { text: decodeURIComponent(encoded) };
  },

  jwt_decode({ token, secret }) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const decode = (s: string) => {
      let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    };
    const header = decode(parts[0]);
    const payload = decode(parts[1]);
    const result: any = { header, payload, signature_present: parts[2].length > 0 };
    if (secret) {
      const expected = createHmac("sha256", secret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      result.signature_valid = expected === parts[2];
    }
    return result;
  },

  json_format({ text, action = "pretty", indent = 2 }) {
    const parsed = JSON.parse(text);
    if (action === "minify") return { result: JSON.stringify(parsed) };
    if (action === "sort") {
      const sortKeys = (v: any): any => {
        if (Array.isArray(v)) return v.map(sortKeys);
        if (v && typeof v === "object") {
          return Object.keys(v).sort().reduce((acc: any, k) => {
            acc[k] = sortKeys(v[k]);
            return acc;
          }, {});
        }
        return v;
      };
      return { result: JSON.stringify(sortKeys(parsed), null, indent) };
    }
    return { result: JSON.stringify(parsed, null, indent) };
  },

  yaml_to_json({ text }) {
    const parsed = parseYaml(text);
    return { result: JSON.stringify(parsed, null, 2) };
  },

  json_to_yaml({ text }) {
    const parsed = JSON.parse(text);
    return { result: stringifyYaml(parsed) };
  },

  cron_explain({ expression }) {
    // Simple cron explainer (5-field standard)
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) {
      return { error: "Expected 5 fields: minute hour day month weekday" };
    }
    const [min, hour, day, month, dow] = fields;
    const explainField = (f: string, name: string, range: [number, number]) => {
      if (f === "*") return `every ${name}`;
      if (f.startsWith("*/")) return `every ${f.slice(2)} ${name}s`;
      if (f.includes(",")) return `at ${name}s ${f}`;
      if (f.includes("-")) return `from ${name} ${f}`;
      return `at ${name} ${f}`;
    };
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dowReadable = /^\d$/.test(dow) ? dowNames[parseInt(dow)] : dow;
    const summary = `Runs ${min === "0" && hour !== "*" ? `at ${hour.padStart(2, "0")}:00` : explainField(min, "minute", [0, 59])}` +
      (hour !== "*" && min !== "0" ? ` ${explainField(hour, "hour", [0, 23])}` : "") +
      (day !== "*" ? ` on day ${day}` : "") +
      (month !== "*" ? ` of month ${month}` : "") +
      (dow !== "*" ? ` (${dowReadable})` : "");
    return { expression, summary, fields: { minute: min, hour, day, month, weekday: dow } };
  },

  timestamp_convert({ value, to = "iso", timezone = "UTC" }) {
    let date: Date;
    const v = value.toString().trim();
    if (/^-?\d+$/.test(v)) {
      const n = Number(v);
      // Heuristic: >10^12 = ms, else seconds
      date = new Date(Math.abs(n) > 1e12 ? n : n * 1000);
    } else {
      date = new Date(v);
    }
    if (isNaN(date.getTime())) throw new Error(`Could not parse: ${value}`);
    if (to === "unix_s") return { result: Math.floor(date.getTime() / 1000) };
    if (to === "unix_ms") return { result: date.getTime() };
    // ISO with timezone
    const tzFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { result: date.toISOString(), localized: tzFormatter.format(date), timezone };
  },

  color_convert({ value, to = "all" }) {
    const v = value.trim().toLowerCase();
    let r = 0, g = 0, b = 0;
    if (v.startsWith("#")) {
      const h = v.slice(1);
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      r = parseInt(full.slice(0, 2), 16);
      g = parseInt(full.slice(2, 4), 16);
      b = parseInt(full.slice(4, 6), 16);
    } else if (v.startsWith("rgb")) {
      const m = v.match(/\d+/g);
      if (!m) throw new Error("Invalid rgb");
      [r, g, b] = m.slice(0, 3).map(Number);
    } else if (v.startsWith("hsl")) {
      const m = v.match(/\d+(?:\.\d+)?/g);
      if (!m) throw new Error("Invalid hsl");
      const [h, s, l] = m.slice(0, 3).map(Number);
      const [rr, gg, bb] = hslToRgb(h, s / 100, l / 100);
      r = rr; g = gg; b = bb;
    } else {
      throw new Error("Unrecognized color format");
    }
    const hex = "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    const [hh, ss, ll] = rgbToHsl(r, g, b);
    const result: any = {};
    if (to === "hex" || to === "all") result.hex = hex;
    if (to === "rgb" || to === "all") result.rgb = `rgb(${r}, ${g}, ${b})`;
    if (to === "hsl" || to === "all")
      result.hsl = `hsl(${Math.round(hh)}, ${Math.round(ss * 100)}%, ${Math.round(ll * 100)}%)`;
    return result;
  },

  slugify({ text, separator = "-" }) {
    const slug = text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, separator)
      .replace(new RegExp(`^${separator}+|${separator}+$`, "g"), "");
    return { slug };
  },

  password_generate({ length = 20, uppercase = true, lowercase = true, digits = true, symbols = true }) {
    let pool = "";
    if (uppercase) pool += "ABCDEFGHJKLMNPQRSTUVWXYZ";
    if (lowercase) pool += "abcdefghijkmnpqrstuvwxyz";
    if (digits) pool += "23456789";
    if (symbols) pool += "!@#$%^&*-_=+";
    if (!pool) throw new Error("At least one character class required");
    const bytes = randomBytes(length * 2);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += pool[bytes[i] % pool.length];
    }
    return { password: result, length };
  },

  lorem_ipsum({ unit = "paragraphs", count = 3 }) {
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
    const pickWord = () => words[Math.floor(Math.random() * words.length)];
    const buildSentence = () => {
      const len = 8 + Math.floor(Math.random() * 8);
      const arr = [];
      for (let i = 0; i < len; i++) arr.push(pickWord());
      arr[0] = arr[0].charAt(0).toUpperCase() + arr[0].slice(1);
      return arr.join(" ") + ".";
    };
    if (unit === "words") {
      const out = [];
      for (let i = 0; i < count; i++) out.push(pickWord());
      return { text: out.join(" ") };
    }
    if (unit === "sentences") {
      const out = [];
      for (let i = 0; i < count; i++) out.push(buildSentence());
      return { text: out.join(" ") };
    }
    const out = [];
    for (let i = 0; i < count; i++) {
      const sLen = 4 + Math.floor(Math.random() * 4);
      const sentences = [];
      for (let j = 0; j < sLen; j++) sentences.push(buildSentence());
      out.push(sentences.join(" "));
    }
    return { text: out.join("\n\n") };
  },
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

// ────────────────────────────────────────────────────────────────────
// Server bootstrap
// ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "mcp-devkit", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const fn = tools[name];
  if (!fn) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    const result = fn(args ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("mcp-devkit running on stdio");
