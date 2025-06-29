import { useState, useEffect, useRef } from "react";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import NerdAlertAvatar from "./nerdalert-avatar";
import ChatSidebar from "./chat-sidebar";
import WalletButton from "../wallet/wallet-button";
import { sendMessage, ChatMessage } from "@/lib/chat-api";

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [currentChatId, setCurrentChatId] = useState("1");
  const thinkTimeout = useRef<NodeJS.Timeout | null>(null);

  // Note: Content cleaning is handled in the MessageList component after full message assembly

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0 && isInitializing) {
      // Don't set isTyping during initialization - keep it false
      setIsThinking(false);
      
      // Use the same API base as the chat-api.ts
      const getApiBase = () => {
        // Check for environment variable first
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NERDALERT_API_URL) {
          return import.meta.env.VITE_NERDALERT_API_URL;
        }
        
        // For local development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          return 'http://localhost:80';
        }
        
        // For production - use the same domain as the frontend
        if (typeof window !== 'undefined') {
          return window.location.origin;
        }
        
        // Fallback
        return 'https://nerdalert.app';
      };
      
      const initializeAgent = async () => {
        console.log("🚀 Starting 5-second initialization sequence...");
        const startTime = Date.now();
        const minDisplayTime = 5000; // 5 seconds minimum
        
        try {
          // Start health check
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(`${getApiBase()}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
          }
          
          console.log("✅ Health check successful! Continuing initialization...");
          
          // Ensure we show the loading screen for at least 5 seconds
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsed);
          
          if (remainingTime > 0) {
            console.log(`⏳ Waiting ${remainingTime}ms more to complete 5-second initialization...`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
          }
          
          console.log("🎉 Initialization complete! Loading chat with welcome message...");
          
          // Connection successful - show pre-made welcome message
          const welcomeMessage: ChatMessage = {
            role: "assistant" as const,
            content: `# 🤖 **NerdAlert AI** - *Your Pop-Culture Companion*

**SYSTEM STATUS:** *ONLINE* ✅  
**NEURAL NETWORKS:** *ACTIVE* 🧠  
**KNOWLEDGE BASE:** *LOADED* 📚  
**ENERGY MATCHING:** *CALIBRATED* ⚡

---

Hey there, fellow geek! 🎮✨ I'm **NerdAlert**, your AI companion for all things pop-culture, tech, and beyond! Whether you're diving into the latest Marvel theories, exploring sci-fi universes, or just want to chat about your favorite fandoms - I'm here to match your energy and dive deep into whatever gets you excited!

**What can we explore together?**
- 🎬 Movies, TV shows, and streaming recommendations
- 🦸‍♂️ Comic book lore and superhero deep-dives  
- 🎮 Gaming news, reviews, and easter eggs
- 🚀 Sci-fi, fantasy, and speculative fiction
- 🎭 Fan theories, trivia, and behind-the-scenes secrets
- 🔬 Tech trends and futuristic concepts

**Ready to geek out?** Just ask me anything - I'll match your enthusiasm and bring the insider knowledge! 🚀

*What's on your mind today?*`,
            timestamp: new Date()
          };
          
          setMessages([welcomeMessage]);
          setIsInitializing(false);
          
        } catch (error) {
          console.error("❌ Connection failed:", error);
          
          // Still ensure minimum display time even on error
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsed);
          
          if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
          }
          
          // Connection failed - show offline alert
          setIsOffline(true);
          setIsInitializing(false);
        }
      };

      // Start the 5-second initialization check
      initializeAgent();
    }
  }, [messages.length, isInitializing]);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { 
      role: "user", 
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setIsThinking(false);
    
    let thinkStart = 0;
    let hasStartedResponse = false;
    
    try {
      let assistantMessageIndex: number | null = null;
      await sendMessage(
        { messages: [...messages, userMessage] },
        (chunk) => {
          setMessages(prev => {
            const newMessages = [...prev];
            // Find the last assistant message after the user message
            if (assistantMessageIndex === null) {
              // First chunk: add new assistant message
              newMessages.push({
                role: "assistant",
                content: chunk,
                timestamp: new Date()
              });
              assistantMessageIndex = newMessages.length - 1;
            } else {
              // Subsequent chunks: append to the last assistant message
              newMessages[assistantMessageIndex].content += chunk;
            }
            return newMessages;
          });
        },
        (thinking) => {
          if (thinking && !hasStartedResponse) {
            thinkStart = Date.now();
            setIsThinking(true);
          } else {
            const elapsed = Date.now() - thinkStart;
            const minTime = 800;
            if (elapsed < minTime && thinkStart > 0) {
              if (thinkTimeout.current) clearTimeout(thinkTimeout.current);
              thinkTimeout.current = setTimeout(() => setIsThinking(false), minTime - elapsed);
            } else {
              setIsThinking(false);
            }
          }
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add error message
      setMessages(prev => [...prev, { 
        role: "assistant" as const, 
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
      setIsThinking(false);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setCurrentChatId(Date.now().toString());
    setIsInitializing(true);
    setIsThinking(false);
    // Welcome message will be fetched by useEffect
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    // In a real app, you'd load messages for the selected chat
  };

  // Show loading screen when initializing
  if (isInitializing) {
    return (
      <div className="flex flex-col h-screen bg-black text-green-400 font-mono">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold animate-pulse">
              INITIALIZING...
            </div>
            <div className="text-sm opacity-70">
              connecting to decentralized systems...
            </div>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex flex-col h-screen bg-black text-red-500 font-mono">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-3xl font-bold animate-pulse text-red-400">
              ALERT ALERT AGENT OFFLINE!
            </div>
            <div className="text-lg opacity-80">
              Unable to establish connection to NerdAlert AI
            </div>
            <div className="text-sm text-red-300 mt-4">
              Please check your connection and try again
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded border border-red-400 transition-colors"
            >
              RETRY CONNECTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="relative z-30 border-b border-neon-cyan bg-cyber-dark/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex items-center space-x-4">
              <NerdAlertAvatar size="lg" />
              <div>
                <h1 className="text-3xl cyber-font font-bold text-neon-cyan text-glow animate-flicker">
                  NERD<span className="text-neon-magenta">ALERT</span>
                </h1>
                <p className="text-xs text-gray-400 terminal-font text-center">CryptoAgent #3800 Ethereum Mainnet</p>
              </div>
            </div>
            <div className="flex-1 flex justify-end items-center space-x-4">
              <WalletButton />
              <ChatSidebar 
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                currentChatId={currentChatId}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 relative z-20 overflow-hidden">
        <MessageList
          messages={messages.map((msg, idx) => ({
            ...msg,
            id: idx,
            timestamp: new Date(),
          }))}
          isTyping={isTyping}
          isLoading={false}
          isThinking={isThinking}
        />
      </main>

      {/* Input Area */}
      <footer className="relative z-30 bg-cyber-dark/95 backdrop-blur-sm border-t border-neon-cyan">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={isTyping}
          messageCount={messages.length}
        />
      </footer>
    </div>
  );
}
