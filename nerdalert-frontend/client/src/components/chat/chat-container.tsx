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
  const [currentChatId, setCurrentChatId] = useState("1");
  const thinkTimeout = useRef<NodeJS.Timeout | null>(null);

  // Helper to clean <think> and internal tags from streamed chunks
  const cleanMessageContent = (chunk: string): string => {
    return chunk
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<processing>[\s\S]*?<\/processing>/gi, '')
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
      .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
      .replace(/<search>[\s\S]*?<\/search>/gi, '')
      .replace(/<verify>[\s\S]*?<\/verify>/gi, '')
      .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/gi, '')
      .replace(/\[PROCESSING\][\s\S]*?\[\/PROCESSING\]/gi, '')
      .replace(/\[ANALYSIS\][\s\S]*?\[\/ANALYSIS\]/gi, '')
      .replace(/\[INTERNAL\][\s\S]*?\[\/INTERNAL\]/gi, '')
      .replace(/\*\*THINKING\*\*[\s\S]*?\*\*\/THINKING\*\*/gi, '')
      .replace(/\*\*PROCESSING\*\*[\s\S]*?\*\*\/PROCESSING\*\*/gi, '')
      .replace(/\*\*ANALYSIS\*\*[\s\S]*?\*\*\/ANALYSIS\*\*/gi, '')
      .replace(/\*\*INTERNAL\*\*[\s\S]*?\*\*\/INTERNAL\*\*/gi, '');
  };

  // Fetch the welcome message from the agent on first load
  useEffect(() => {
    if (messages.length === 0) {
      setIsInitializing(true);
      setIsTyping(true);
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
      
      const apiBase = getApiBase();
      
      fetch(`${apiBase}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(async (res) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let result = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  result += content;
                  setMessages([{ role: "assistant" as const, content: cleanMessageContent(result) }]);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
        setIsTyping(false);
        setIsInitializing(false);
        setIsThinking(false);
      }).catch((error) => {
        console.error("Failed to initialize agent:", error);
        setIsTyping(false);
        setIsInitializing(false);
        setIsThinking(false);
        // Add a fallback welcome message
        setMessages([{ 
          role: "assistant" as const, 
          content: "> WELCOME TO THE NEURAL INTERFACE\n> I'M NERDALERT, YOUR CYBERPUNK AI COMPANION\n> READY TO DISCUSS POP CULTURE, TECH, COMICS & MORE\n> TYPE YOUR QUERY TO BEGIN..." 
        }]);
      });
    }
  }, [messages.length]);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setIsThinking(false);
    let thinkStart = 0;
    await sendMessage(
      { messages: [...messages, userMessage] },
      (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content += cleanMessageContent(chunk);
          } else {
            newMessages.push({ role: "assistant", content: cleanMessageContent(chunk) });
          }
          return newMessages;
        });
      },
      (thinking) => {
        if (thinking) {
          thinkStart = Date.now();
          setIsThinking(true);
        } else {
          const elapsed = Date.now() - thinkStart;
          const minTime = 800;
          if (elapsed < minTime) {
            if (thinkTimeout.current) clearTimeout(thinkTimeout.current);
            thinkTimeout.current = setTimeout(() => setIsThinking(false), minTime - elapsed);
          } else {
            setIsThinking(false);
          }
        }
      }
    );
    setIsTyping(false);
    setIsThinking(false);
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

        {/* Loading Screen */}
        <main className="flex-1 relative z-20 flex items-center justify-center bg-cyber-dark">
          <div className="text-center space-y-6">
            <div className="relative">
              <NerdAlertAvatar size="lg" />
              <div className="absolute inset-0 bg-neon-cyan rounded-full animate-pulse opacity-20"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl cyber-font font-bold text-neon-cyan text-glow">
                NerdAlert Agent 3800
              </h2>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-neon-magenta rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-neon-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-xl text-neon-cyan terminal-font font-bold">INITIALIZING</p>
            </div>
          </div>
        </main>
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
          isTyping={isTyping || isThinking}
          isLoading={false}
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
