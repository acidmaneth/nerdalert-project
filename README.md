# EAI - Enhanced AI Agent Development Platform

A comprehensive platform for developing, testing, and deploying AI agents with local model support, conversation memory, and advanced prompt engineering capabilities.

## 🚀 Project Overview

EAI is a full-stack AI agent development environment that includes:

- **NerdAlert Agent**: A specialized pop-culture AI agent with web search, conversation memory, and adaptive personality
- **LocalAI Integration**: Local model deployment and management
- **Development Tools**: Cleanup scripts, testing utilities, and development guides
- **Advanced Features**: Energy matching, conversation memory, and dynamic prompt engineering

## 📁 Project Structure

```
EAI/
├── nerdalert-agent/          # Main AI agent application
├── local-ai/                 # LocalAI configuration and models
├── agent-dev-guide/          # Development documentation
├── cleanup-local-ai.sh       # System cleanup utility
├── start-local-ai.sh         # LocalAI startup script
└── README.md                 # This file
```

## 🎯 Key Features

### NerdAlert Agent
- **Pop-Culture Expertise**: Deep knowledge of movies, TV, comics, tech, and geek culture
- **Real-Time Information**: Web search integration for up-to-date facts and news
- **Energy Matching**: Dynamically adapts to user's enthusiasm and emotional tone
- **Conversation Memory**: Maintains context across conversations
- **Spoiler Protection**: Automatic spoiler warnings and content filtering
- **Event Tracking**: Conventions, premieres, theme park events, and fan gatherings

### LocalAI Integration
- **Local Model Support**: Run AI models locally without external dependencies
- **Model Management**: Easy model switching and configuration
- **Performance Optimization**: Optimized for local deployment

### Development Tools
- **Cleanup Scripts**: Automated system cleanup and process management
- **Testing Framework**: Comprehensive test suite for agent functionality
- **Development Guides**: Step-by-step setup and customization instructions

## 🛠️ Recent Updates (v1.1.2)

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

### 📚 Documentation
- **Comprehensive README**: Updated with installation and usage instructions
- **Development Guides**: Added setup and customization documentation
- **API Documentation**: Clear examples and endpoint descriptions

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- Docker (for LocalAI)
- Serper API key (for web search functionality)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/EAI.git
   cd EAI
   ```

2. **Set up LocalAI**:
   ```bash
   chmod +x start-local-ai.sh
   ./start-local-ai.sh
   ```

3. **Install NerdAlert Agent**:
   ```bash
   cd nerdalert-agent
   npm install
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Start the agent**:
   ```bash
   npm run dev
   ```

## 🎮 Usage Examples

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

### Energy Matching Examples
- **Excited User**: "OMG, did you see the new trailer?! 🔥🔥🔥"
- **Calm User**: "What do you think about the new season?"
- **Frustrated User**: "I can't believe they changed that character's backstory"

The agent will match your energy level and respond accordingly!

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 80)
- `LLM_API_KEY` - Your LLM API key
- `LLM_BASE_URL` - LLM service URL
- `MODEL` - AI model name
- `SERPER_API_KEY` - Web search API key
- `SYSTEM_PROMPT` - Override default system prompt

### Customizing the Agent
Edit `nerdalert-agent/src/system-prompt.txt` to customize:
- Personality traits
- Energy matching behavior
- Communication style
- Special interests and knowledge areas

## 🧪 Testing

Run the test suite:
```bash
cd nerdalert-agent
npm test
```

## 🛠️ Development

### Available Commands
- `npm run dev` — Start NerdAlert in development mode
- `npm run start` — Start NerdAlert in production mode
- `npm test` — Run tests

### Cleanup and Maintenance
```bash
# Clean up all processes and files
./cleanup-local-ai.sh

# Start LocalAI fresh
./start-local-ai.sh
```

## 📊 Performance

- **Response Time**: < 2 seconds for most queries
- **Memory Usage**: Optimized for local deployment
- **Scalability**: Designed for single-user to small-group usage
- **Reliability**: Robust error handling and recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LocalAI** for local model deployment capabilities
- **Serper API** for web search functionality
- **OpenAI** for API integration patterns
- **The AI/ML community** for inspiration and best practices

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Check the documentation in `agent-dev-guide/`
- Review the troubleshooting section in the NerdAlert README

---

**Made with ❤️ for the geek community** 