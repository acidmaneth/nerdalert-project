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
- **Correction Handling**: Learns from user corrections and prevents repeating mistakes
- **Dynamic Response Formatting**: Automatically adapts response style based on user intent (lists, deep dives, quick facts, conversations)

## 🚀 Recent Updates (v1.4.0)

### ✨ New Accuracy Features
- **Prevention-First Approach**: Verifies information before responding to prevent false claims
- **User Correction Detection**: Automatically detects when users are correcting the agent
- **Correction Memory System**: Remembers corrections to prevent repeating mistakes
- **Enhanced Accuracy Checking**: Pre-verification of all claims against authoritative sources
- **Confidence Level Reporting**: Transparent accuracy levels (HIGH/MEDIUM/LOW) for all information
- **Multiple Source Verification**: Cross-references information from multiple authoritative sources
- **Humble Correction Acknowledgment**: Thanks users for corrections and shows appreciation for their knowledge

### 🔧 Technical Improvements
- **New Accuracy Tools**: `check_accuracy_before_response()` and `handle_user_correction()`
- **Enhanced Conversation Memory**: Tracks corrections with confidence levels and timestamps
- **Pattern-Based Correction Detection**: Identifies various correction patterns in user messages
- **Source Hierarchy**: Prioritizes official sources over speculation
- **Real-Time Verification**: Checks claims against RAG knowledge base and web sources

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

## 🎯 Accuracy & Correction Handling

### Prevention-First Approach
NerdAlert now **prevents false claims** rather than just correcting them:

- **Pre-verification** of all claims before responding
- **Multiple source cross-referencing** for every fact
- **Confidence-based response filtering** - only share verified information
- **Automatic fact-checking** for claims that seem uncertain

### User Correction Handling
When users correct the agent, it:

- **Immediately acknowledges** the mistake and apologizes
- **Thanks the user** for the correction and shows appreciation
- **Re-researches** the topic with the corrected information
- **Updates its understanding** for future discussions
- **Never argues** with corrections - fans know their stuff

### Example Correction Handling
```
User: "Actually, Tom Holland plays Spider-Man, not Andrew Garfield"
Agent: "You're absolutely right! Thank you for the correction. Tom Holland has been playing Spider-Man in the MCU since 2016. I appreciate you keeping me accurate - fans know their stuff better than anyone!"
```

## 🎨 Dynamic Response Formatting

NerdAlert now **automatically adapts its response style** based on what you're asking for:

### **List Format** - For when you want lists
**Triggers**: "list of", "top 5", "best", "examples of"
```
User: "List the top 5 Marvel movies"
Agent: "Here are the top 5 Marvel movies:
• Avengers: Endgame (2019) - Highest-grossing film
• Black Panther (2018) - Cultural phenomenon
• Iron Man (2008) - Started the MCU
• The Avengers (2012) - First team-up
• Captain America: Civil War (2016) - Epic conflict"
```

### **Deep Dive Format** - For comprehensive information
**Triggers**: "deep dive", "tell me everything", "explain in detail", "background"
```
User: "Tell me everything about Spider-Man's origin story"
Agent: "Spider-Man's origin story is one of the most iconic in comic book history. Peter Parker was a brilliant but socially awkward high school student who was bitten by a radioactive spider during a science demonstration. This transformative event granted him spider-like abilities including enhanced strength, agility, wall-crawling, and a precognitive 'spider-sense' that warns him of danger..."
```

### **Quick Fact Format** - For brief answers
**Triggers**: "quick", "brief", "just", "simple"
```
User: "Quick answer: who plays Batman?"
Agent: "Robert Pattinson plays Batman in The Batman (2022)."
```

### **Conversational Format** - For opinions and discussions
**Triggers**: "what do you think", "your opinion", "how do you feel", "compare"
```
User: "What do you think about the latest Star Wars movie?"
Agent: "Honestly, I think it's a mixed bag! The visual effects are absolutely stunning, and the action sequences are some of the best in the franchise. But I have to say, the pacing felt a bit off in the middle act. What did you think about it?"
```

### **Natural Format** - Default balanced responses
For standard queries, NerdAlert provides balanced, natural responses that match your energy level.

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

Test accuracy improvements:
```bash
npm run test:accuracy
```

## 📁 Available Commands

- `npm run dev` — Start NerdAlert in development mode
- `npm run start` — Start NerdAlert in production mode
- `npm test` — Run tests
- `npm run test:research` — Test research capabilities
- `npm run test:rag` — Test RAG capabilities
- `npm run test:memory` — Test memory system
- `npm run test:dates` — Test date accuracy
- `npm run test:accuracy` — Test accuracy improvements and correction handling
- `npm run test:formatting` — Test dynamic response formatting

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

6. **False claims or inaccuracies**
   - The new accuracy checking system should prevent this
   - If you notice inaccuracies, correct the agent and it will learn from the correction

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for the geek community**

## [1.4.0] - 2024-12-01

### ✨ Accuracy Improvements & Correction Handling
- **Prevention-First Approach**: Verifies information before responding to prevent false claims
- **User Correction Detection**: Automatically detects when users are correcting the agent
- **Correction Memory System**: Remembers corrections to prevent repeating mistakes
- **Enhanced Accuracy Checking**: Pre-verification of all claims against authoritative sources
- **Confidence Level Reporting**: Transparent accuracy levels (HIGH/MEDIUM/LOW) for all information
- **Multiple Source Verification**: Cross-references information from multiple authoritative sources
- **Humble Correction Acknowledgment**: Thanks users for corrections and shows appreciation for their knowledge

### 🔧 Technical Improvements
- **New Accuracy Tools**: `check_accuracy_before_response()` and `handle_user_correction()`
- **Enhanced Conversation Memory**: Tracks corrections with confidence levels and timestamps
- **Pattern-Based Correction Detection**: Identifies various correction patterns in user messages
- **Source Hierarchy**: Prioritizes official sources over speculation
- **Real-Time Verification**: Checks claims against RAG knowledge base and web sources

---

## [1.3.3] - 2024-07-26

### ✨ Stable Build & Streaming UX Polish
- Main chat bubble now only shows content after the last </think> tag, preserving all formatting and markdown.
- "Thinking"/internal agent thoughts are never shown in the main chat bubble, only in the collapsible "Show Thinking" section.
- The "THINKING..." animation is shown while the agent is still thinking, and the main answer appears as soon as it starts streaming in.
- The welcome/intro message is always shown in full, with all formatting preserved.
- This is the **current stable build** and recommended for production use.

---
