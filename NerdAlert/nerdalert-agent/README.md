# NerdAlert AI Agent

NerdAlert is a specialized AI agent designed for pop-culture enthusiasts, geeks, and nerds. It provides deep research, trivia, insider information, and engaging conversations about movies, TV shows, comics, tech, and all things geek culture.

## 🎯 Features

- **Pop-Culture Expertise**: Deep knowledge of movies, TV, comics, tech, and geek culture
- **Real-Time Information**: Web search integration for up-to-date facts and news
- **Enhanced Research**: Multi-strategy deep research with source prioritization
- **Energy Matching**: Dynamically adapts to user's enthusiasm and emotional tone
- **Conversation Memory**: Maintains context across conversations
- **Spoiler Protection**: Automatic spoiler warnings and content filtering
- **Event Tracking**: Conventions, premieres, theme park events, and fan gatherings
- **Trivia & Insider Info**: Character lore, easter eggs, and behind-the-scenes details
- **Adaptive Personality**: Matches user's enthusiasm level and interests
- **Accuracy Focus**: Pop-culture trivia is sacred - all facts are verified through authoritative sources

## 🚀 Recent Updates (v1.3.0)

### ✨ New Features
- **RAG (Retrieval-Augmented Generation)**: Enhanced knowledge base with vector search for accurate, verified information
- **Knowledge Base Integration**: Maintains verified facts with confidence levels and source attribution
- **Enhanced Research System**: Multi-strategy deep research with specialized search types
- **Source Prioritization**: Official sources (marvel.com, dc.com, etc.) prioritized over speculation
- **Deep Trivia Search**: Specialized research for character details, plot points, dates, and canon information
- **Accuracy Verification**: Cross-referencing information from multiple authoritative sources
- **Fan Site Integration**: Direct access to fandom.com, memory-alpha.org, wookieepedia.org, and more
- **Repetition Prevention**: Advanced memory system prevents duplicate explanations
- **Natural Conversation Flow**: No more internal thinking tags or over-analysis

### 🔧 Technical Improvements
- **Multi-Strategy Search**: 5 different search strategies for comprehensive coverage
- **Source Authority Scoring**: Results prioritized by source credibility
- **Duplicate Detection**: Intelligent filtering of repetitive content
- **Enhanced Memory System**: Better tracking of discussed topics and concepts
- **Improved Error Handling**: Graceful fallback when search strategies fail

## 📅 Enhanced Date Accuracy (v1.2.1)

### 🎯 Date Validation Features
- **Current Year Context**: Agent always aware of the current year and validates all dates against it
- **Future Date Detection**: Automatically flags dates that are in the future as potentially incorrect
- **Release Date Verification**: Searches for the most recent official movie/TV show release information
- **Temporal Context**: Distinguishes between historical, current, and future events appropriately
- **Source Attribution**: Always mentions confidence levels and sources for date information

### 🔍 Date Verification Workflow
1. **Initial Research**: Gather information using deep trivia search
2. **Date Extraction**: Identify all dates mentioned in the response
3. **Current Year Validation**: Check dates against the current year context
4. **Multi-Source Verification**: Cross-reference with official sources and databases
5. **Confidence Assessment**: Provide confidence levels based on source quality
6. **Conflict Resolution**: Explain discrepancies when sources disagree

### 📊 Example Date Validation
```
User: "When is the next Marvel movie coming out?"
Agent: "Let me search for the most recent Marvel release information...
[After verification] The next confirmed Marvel movie is 'Deadpool & Wolverine' 
scheduled for July 26, 2024 (HIGH confidence, verified by Marvel.com and 
industry news sources)."
```

### 🧪 Testing Date Accuracy
```bash
# Test date accuracy features
npm run test:dates

# Test research capabilities
npm run test:research

# Test memory system
npm run test:memory
```

## 📋 Requirements

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (for LocalAI integration)
- [Serper API Key](https://serper.dev/) (for web search functionality)

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/acidmaneth/nerdalert-project.git
   cd nerdalert-project/nerdalert-agent
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

## 🔍 Enhanced Research Capabilities

NerdAlert now provides deep, accurate research with multiple specialized search strategies:

### Search Types
- **Character Research**: Deep dive into character backgrounds, origins, and relationships
- **Plot Analysis**: Detailed storyline information and plot summaries
- **Trivia Facts**: Behind-the-scenes details, easter eggs, and fun facts
- **Date Verification**: Release dates, premiere dates, and timeline information
- **Canon Research**: Official canon vs. non-canon information
- **Fan Theories**: Community speculation and theory discussions

### Source Prioritization
Results are automatically prioritized by source authority:
1. **Official Sources** (10/10): marvel.com, dc.com, starwars.com, disney.com
2. **Fan Wikis** (9/10): fandom.com, memory-alpha.org, wookieepedia.org
3. **Entertainment News** (8/10): variety.com, hollywoodreporter.com, deadline.com
4. **Review Sites** (7/10): imdb.com, rottentomatoes.com, metacritic.com
5. **Fan Communities** (6/10): reddit.com fan subreddits
6. **General News** (5/10): cnn.com, bbc.com, reuters.com

### Research Examples

**Character Research**:
```bash
curl --location 'http://localhost:80/prompt' \
--header 'Content-Type: application/json' \
--data '{
  "messages": [
    {
      "role": "user", 
      "content": "Tell me everything about Spider-Man's origin story"
    }
  ]
}'
```

**Trivia Research**:
```bash
curl --location 'http://localhost:80/prompt' \
--header 'Content-Type: application/json' \
--data '{
  "messages": [
    {
      "role": "user",
      "content": "What are the best easter eggs in the latest Marvel movie?"
    }
  ]
}'
```

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

## 🧠 RAG (Retrieval-Augmented Generation) Features

NerdAlert now includes a sophisticated RAG system that provides verified, accurate information with confidence levels:

### 🎯 RAG Capabilities
- **Knowledge Base**: Maintains verified facts about movies, TV shows, characters, and events
- **Vector Search**: Fast similarity search for relevant information
- **Confidence Levels**: Every piece of information comes with HIGH/MEDIUM/LOW confidence ratings
- **Source Attribution**: Always cites sources for transparency
- **Conflict Detection**: Automatically identifies contradictory information
- **Currency Validation**: Ensures information is current and up-to-date

### 📊 Knowledge Base Structure
```typescript
{
  "deadpool-wolverine-2024": {
    title: "Deadpool & Wolverine",
    content: "Marvel Studios' Deadpool & Wolverine...",
    category: "movie",
    franchise: "Marvel",
    releaseDate: "2024-07-26",
    status: "released",
    verified: true,
    sources: ["marvel.com", "imdb.com"],
    confidence: "HIGH",
    canonStatus: "CANON"
  }
}
```

### 🔍 RAG Search Examples
```bash
# Test RAG capabilities
npm run test:rag

# Test date accuracy
npm run test:dates

# Test memory system
npm run test:memory
```

### 🎭 Energy Matching Examples

## 🔧 Customizing NerdAlert

### System Prompt Customization
You can customize NerdAlert's personality and behavior by editing the `system-prompt.txt` file. This file contains the core personality and instructions that guide the agent's responses.

1. Open `src/system-prompt.txt` and modify:
   - Personality traits
   - Energy matching behavior
   - Communication style
   - Special interests and knowledge areas
   - Research accuracy rules

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

Test enhanced research capabilities:
```bash
node test-research.js
```

Test RAG capabilities:
```bash
node test-rag.js
```

## 📁 Available Commands

- `npm run dev` — Start NerdAlert in development mode
- `npm run start` — Start NerdAlert in production mode
- `npm test` — Run tests
- `npm run test:research` — Test research capabilities
- `npm run test:rag` — Test RAG capabilities
- `npm run test:memory` — Test memory system
- `npm run test:dates` — Test date accuracy

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
   - The enhanced research system now automatically searches for the latest information
   - Check that your SERPER_API_KEY is properly configured

4. **Repetitive responses**
   - The new memory system should prevent this. If issues persist, check the conversation memory settings

5. **Search timeouts**
   - The system now has multiple fallback strategies. If one search fails, others will be attempted

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for the geek community**
