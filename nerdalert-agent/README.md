# NerdAlert AI Agent

NerdAlert is a specialized AI agent designed for pop-culture enthusiasts, geeks, and nerds. It provides deep research, trivia, insider information, and engaging conversations about movies, TV shows, comics, tech, and all things geek culture.

## Features

- **Pop-Culture Expertise**: Deep knowledge of movies, TV, comics, tech, and geek culture
- **Real-Time Information**: Web search integration for up-to-date facts and news
- **Spoiler Protection**: Automatic spoiler warnings and content filtering
- **Event Tracking**: Conventions, premieres, theme park events, and fan gatherings
- **Trivia & Insider Info**: Character lore, easter eggs, and behind-the-scenes details
- **Adaptive Personality**: Matches user's enthusiasm level and interests

## Requirements

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/nerdalert.git
   cd nerdalert/nerdalert-agent
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Usage

To start NerdAlert in development mode:

```bash
npm run dev
# or
yarn dev
```

The agent will be available at `http://localhost:80`

## Customizing NerdAlert

You can customize NerdAlert's personality and behavior by editing the `system-prompt.txt` file. This file contains the core personality and instructions that guide the agent's responses.

### Updating the System Prompt

1. Open `src/system-prompt.txt` and modify the personality traits, interests, or behavioral guidelines
2. The agent will automatically use these instructions when processing requests
3. You can also set the system prompt using the `SYSTEM_PROMPT` environment variable

## Example API Call

You can interact with NerdAlert using a simple API call:

```bash
curl --location 'http://localhost:80/prompt' \
--header 'Content-Type: application/json' \
--data '{
  "messages": [
    {
      "role": "user",
      "content": "What are the latest Marvel movie updates?"
    }
  ]
}'
```

## Available Commands

- `npm run dev` — Start NerdAlert in development mode
- `npm run start` — Start NerdAlert in production mode
- `npm test` — Run tests

## Environment Variables

- `PORT` - Server port (default: 80)
- `LLM_API_KEY` - Your LLM API key
- `LLM_BASE_URL` - LLM service URL
- `MODEL` - AI model name
- `SERPER_API_KEY` - Web search API key
- `SYSTEM_PROMPT` - Override default system prompt

---

**Note:** Keep the `PORT` and `LLM_BASE_URL` environment variables as they are required by the platform.
