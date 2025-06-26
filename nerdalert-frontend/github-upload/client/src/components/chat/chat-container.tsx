import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import NerdAlertAvatar from "./nerdalert-avatar";
import ChatSidebar from "./chat-sidebar";
import WalletButton from "../wallet/wallet-button";
import { sendMessage } from "@/lib/chat-api";
import type { Message } from "@shared/schema";

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentChatId, setCurrentChatId] = useState("1");
  const queryClient = useQueryClient();

  const { data: messagesData = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: false,
    queryFn: async () => {
      const response = await fetch("/api/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ messages }: { messages: Message[] }) => {
      const response = await fetch("/prompt-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Fetch the welcome message from the agent on first load
  useEffect(() => {
    if (messages.length === 0) {
      setIsInitializing(true);
      setIsTyping(true);
      fetch(`${window.location.origin.replace(/:[0-9]+$/, ':80')}/start`, {
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
                  setMessages([{ 
                    id: 0,
                    role: "assistant" as const, 
                    content: result,
                    timestamp: new Date()
                  }]);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
        setIsTyping(false);
        setIsInitializing(false);
      }).catch((error) => {
        console.error("Failed to initialize agent:", error);
        setIsTyping(false);
        setIsInitializing(false);
        // Add a fallback welcome message
        setMessages([{ 
          id: 0,
          role: "assistant" as const, 
          content: "> WELCOME TO THE NEURAL INTERFACE\n> I'M NERDALERT, YOUR CYBERPUNK AI COMPANION\n> READY TO DISCUSS POP CULTURE, TECH, COMICS & MORE\n> TYPE YOUR QUERY TO BEGIN...",
          timestamp: new Date()
        }]);
      });
    }
  }, [messages.length]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = { 
      id: messages.length,
      role: "user", 
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Start typing state
    setIsTyping(true);
    
    // Send message and handle streaming
    await sendMessage(
      { messages: [...messages, userMessage] },
      (chunk) => {
        // Update the last message (assistant's response) with accumulated content
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === "assistant") {
            // Update existing assistant message
            lastMessage.content += chunk;
          } else {
            // Create new assistant message
            newMessages.push({ 
              id: newMessages.length,
              role: "assistant", 
              content: chunk,
              timestamp: new Date()
            });
          }
          
          return newMessages;
        });
      }
    );
    
    // Stop typing state
    setIsTyping(false);
  };

  const handleNewChat = async () => {
    try {
      await fetch("/api/messages", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setCurrentChatId(Date.now().toString());
      setIsInitializing(true);
      // Welcome message will be fetched by useEffect
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
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
                INITIALIZING NEURAL NETWORK
              </h2>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-neon-magenta rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-neon-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-sm text-gray-400 terminal-font">
                Establishing secure connection to AI core...
              </p>
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
          isTyping={isTyping}
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
