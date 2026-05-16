# Example prompts for mcp-devkit

Paste any of these into Claude Desktop / Cursor with mcp-devkit installed.

## Crypto

```
Generate 3 UUID v7s for me.
```

```
Compute the SHA-256 hash of "the quick brown fox" in base64.
```

```
HMAC-sign the string "user_id=42&exp=1715890800" with secret "s3cr3t".
```

## Encoding

```
Base64-encode this in URL-safe form: https://example.com/path?q=hello world
```

```
Decode this base64: aGVsbG8gd29ybGQ=
```

```
Decode this JWT and show me the payload:
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.signature
```

## Data

```
Pretty-print and sort keys of this JSON: {"name":"alice","age":30,"id":1}
```

```
Convert this YAML to JSON:
name: alice
roles:
  - admin
  - user
```

## Time

```
Explain this cron expression: 0 */6 * * *
```

```
Convert Unix timestamp 1715890800 to ISO 8601 in America/Toronto timezone.
```

## Misc

```
Convert color #ff5722 to RGB and HSL.
```

```
Slugify this title: "My Awesome Blog Post — 2026 Edition!"
```

```
Generate a 24-char password with letters and digits only (no symbols).
```

```
Give me 2 paragraphs of Lorem Ipsum.
```

## Composing tools

```
Generate a UUID v7, then base64-encode it URL-safe.
```

```
Take this SQL: SELECT * FROM users WHERE id = 42
Hash it with SHA-256, then base64-encode the result.
```
