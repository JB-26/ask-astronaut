# ask-astronaut

### Getting Started
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run start
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

You will also need API keys for the following services:

- [NASA APOD API](https://api.nasa.gov/)
- [Anthropic Claude API](https://platform.claude.com/)

These keys will then need to be stored in a `.env` file in the root directory.

### Technologies Used

- Runtime: Bun (server + bundler)
- Language: TypeScript (both server and client)
- AI: Anthropic SDK (claude-haiku-4-5-20251001)
- Styling: Tailwind CSS (dark theme with orange accents)
- APIs: NASA APOD API


| Route        | Method | Purpose                                            |
|--------------|--------|----------------------------------------------------|
| /            | GET    | Serves index.html                                  |
| /api/apod    | GET    | Fetches random NASA APOD image                     |
| /api/ask     | POST   | Sends image + question to Claude, streams response |
| /client.js   | GET    | Transpiles & serves client.ts                      |
| /styles.css  | GET    | Serves compiled Tailwind CSS                       |
