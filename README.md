# mcp-devkit

> 15 zero-config developer utilities for Claude Desktop, Cursor, and any MCP client. Free. MIT.

All the small dev utilities you keep alt-tabbing for, in one MCP server. Drop into Claude Desktop in 30 seconds. No API keys. No paywall. No telemetry.

---

## Install

### Option 1: Claude Desktop (recommended)

1. Open Claude Desktop → Settings → Extensions → Browse extensions
2. Search "Dev Kit" → Install
3. Done. Tools are available in any chat.

### Option 2: Manual stdio config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devkit": {
      "command": "npx",
      "args": ["-y", "mcp-devkit"]
    }
  }
}
```

Or clone and run locally:

```bash
git clone https://github.com/jeffereychown-Max/mcp-devkit.git
cd mcp-devkit && npm install
node --experimental-strip-types src/index.ts
```

Requires Node.js 22.18+ (for native TypeScript support).

---

## Tools (15)

### Crypto
- **`uuid`** — Generate UUID v4 or v7. Optional batch count.
- **`hash`** — md5 / sha1 / sha256 / sha512 of any text.
- **`hmac`** — HMAC signature with secret.

### Encoding
- **`base64_encode`** / **`base64_decode`** — Standard or URL-safe.
- **`url_encode`** / **`url_decode`** — RFC 3986 percent encoding.
- **`jwt_decode`** — Header + payload. Optional signature verification with secret.

### Data
- **`json_format`** — pretty / minify / sort keys.
- **`yaml_to_json`** / **`json_to_yaml`** — Round-trip safe.

### Time
- **`cron_explain`** — `"0 9 * * 1"` → "Runs at 09:00 on Mon".
- **`timestamp_convert`** — Unix ↔ ISO 8601 in any IANA timezone.

### Misc
- **`color_convert`** — hex ↔ rgb ↔ hsl.
- **`slugify`** — Any string → URL-safe slug.
- **`password_generate`** — Cryptographically random, configurable policy.
- **`lorem_ipsum`** — Words, sentences, or paragraphs.

---

## Example prompts

Once installed, just ask Claude naturally:

- *"Generate 5 UUIDs."*
- *"What's the SHA-256 of this string: hello world?"*
- *"Decode this JWT: eyJhbGciOiJI..."*
- *"Explain this cron: 0 */6 * * *"*
- *"Convert 1715890800 to ISO time in America/Toronto."*
- *"Generate a 32-char password without symbols."*
- *"Convert this YAML to JSON: ..."*
- *"What is #ff5722 in HSL?"*
- *"Slugify 'My Awesome Blog Post 2026!'"*

---

## Why?

Modern devs paste curl output into Claude. Then they alt-tab to DevUtils.app for a hash. Then to a tab for a UUID. Then to a JWT debugger. Then back.

**`mcp-devkit` keeps them in one place.** Free, MIT, audited, with simple LLM-facing tool descriptions. No paywall (looking at you, $9-19/mo competitors).

---

## What's next

- v0.2: Add unit tests, GitHub Actions CI.
- v0.3: WHOIS, DNS query, JSON schema validate.
- v1.0: Full coverage + i18n.

PRs welcome. Issues welcome.

---

## Sister servers from dpm

- **`mcp-public-data`** — Sun, moon, holidays, timezone, geocoding (zero API keys, like this one).

More coming. Follow the dpm catalog at `github.com/jeffereychown-Max` for updates.

---

## License

MIT © dpm (digital product mill)
