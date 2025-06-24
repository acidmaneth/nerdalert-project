# NerdAlert AI Agent

NerdAlert is a specialized AI agent designed for pop-culture enthusiasts, geeks, and nerds. It provides deep research, trivia, insider information, and engaging conversations about movies, TV shows, comics, tech, and all things geek culture.

## 🎯 Features

- **Pop-Culture Expertise**: Deep knowledge of movies, TV, comics, tech, and geek culture
- **Real-Time Information**: Web search integration for up-to-date facts and news
- **Energy Matching**: Dynamically adapts to user's enthusiasm and emotional tone
- **Conversation Memory**: Maintains context across conversations
- **Spoiler Protection**: Automatic spoiler warnings and content filtering
- **Event Tracking**: Conventions, premieres, theme park events, and fan gatherings
- **Trivia & Insider Info**: Character lore, easter eggs, and behind-the-scenes details
- **Adaptive Personality**: Matches user's enthusiasm level and interests

## 🚀 Recent Updates (v1.1.2)

### ✨ New Features
- **Energy Matching System**: Agent now dynamically matches user's enthusiasm and emotional tone
- **Enhanced Conversation Memory**: Improved context retention and conversation flow
- **Advanced Prompt Engineering**: More sophisticated system prompts with behavioral controls
- **Web Search Integration**: Real-time information retrieval with Serper API
- **Local Model Support**: Full compatibility with LocalAI for privacy-focused deployment

### 🔧 Technical Improvements
- **Bug Fixes**: Resolved tool call handling issues in chat.py
- **Performance Optimization**: Improved response times and memory usage
- **Error Handling**: Better error recovery and user feedback
- **Code Quality**: Enhanced TypeScript types and code organization

## 📋 Requirements

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (for LocalAI integration)
- [Serper API Key](https://serper.dev/) (for web search functionality)

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/EAI.git
   cd EAI/nerdalert-agent
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## 🎮 Usage

### Development Mode
```bash
npm run dev
# or
yarn dev
```

### Production Mode
```bash
npm run start
# or
yarn start
```

The agent will be available at `http://localhost:80`

## 🎭 Energy Matching Examples

NerdAlert now dynamically matches your energy level! Here are some examples:

### Excited User
**You**: "OMG, did you see the new trailer?! 🔥🔥🔥"
**NerdAlert**: "YESSSS! I'm absolutely losing my mind over this! 🔥🔥🔥 The hype is real!"

### Calm User
**You**: "What do you think about the new season?"
**NerdAlert**: "It's been quite interesting to see how they've developed the characters this season..."

### Frustrated User
**You**: "I can't believe they changed that character's backstory"
**NerdAlert**: "I totally get your frustration - that was a pretty bold move on their part..."

## 🔧 Customizing NerdAlert

### System Prompt Customization
You can customize NerdAlert's personality and behavior by editing the `system-prompt.txt` file. This file contains the core personality and instructions that guide the agent's responses.

1. Open `src/system-prompt.txt` and modify:
   - Personality traits
   - Energy matching behavior
   - Communication style
   - Special interests and knowledge areas

2. The agent will automatically use these instructions when processing requests

3. You can also set the system prompt using the `SYSTEM_PROMPT` environment variable

### Conversation Memory
The agent now maintains conversation context across interactions, allowing for more natural and coherent conversations.

## 📡 API Examples

### Basic Interaction
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

### With Conversation Memory
```bash
curl --location 'http://localhost:80/prompt' \
--header 'Content-Type: application/json' \
--data '{
  "messages": [
    {
      "role": "user",
      "content": "Tell me about Spider-Man"
    },
    {
      "role": "assistant",
      "content": "Spider-Man is one of Marvel's most iconic characters..."
    },
    {
      "role": "user",
      "content": "What about his latest movie?"
    }
  ]
}'
```

## 🧪 Testing

Run the test suite:
```bash
npm test
# or
yarn test
```

## 📁 Available Commands

- `npm run dev` — Start NerdAlert in development mode
- `npm run start` — Start NerdAlert in production mode
- `npm test` — Run tests

## 🔐 Environment Variables

- `PORT` - Server port (default: 80)
- `LLM_API_KEY` - Your LLM API key
- `LLM_BASE_URL` - LLM service URL (default: http://localhost:8080/v1)
- `MODEL` - AI model name (default: local-model)
- `SERPER_API_KEY` - Web search API key
- `SYSTEM_PROMPT` - Override default system prompt

## 🔧 LocalAI Integration

NerdAlert is designed to work seamlessly with LocalAI for privacy-focused deployment:

1. **Start LocalAI** (from the EAI root directory):
   ```bash
   ./start-local-ai.sh
   ```

2. **Clean up when needed**:
   ```bash
   ./cleanup-local-ai.sh
   ```

## 🐛 Troubleshooting

### Common Issues

1. **"zsh: command not found: local-ai"**
   - Activate your Python environment: `source local-ai/bin/activate`

2. **"TypeError: 'NoneType' object is not iterable"**
   - This has been fixed in the latest version. Update your code if you're still seeing this.

3. **Agent giving outdated information**
   - Ensure your `SERPER_API_KEY` is set correctly
   - Check that web search is enabled in the tool configuration

4. **LocalAI not responding**
   - Run the cleanup script: `./cleanup-local-ai.sh`
   - Restart LocalAI: `./start-local-ai.sh`

## 📊 Performance Metrics

- **Response Time**: < 2 seconds for most queries
- **Memory Usage**: Optimized for local deployment
- **Context Retention**: Maintains conversation history across sessions
- **Energy Matching**: Real-time adaptation to user emotional state

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the geek community**
