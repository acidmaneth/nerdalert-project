import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import NerdAlertAvatar from "./nerdalert-avatar";
import ChatSidebar from "./chat-sidebar";
import WalletButton from "../wallet/wallet-button";
import { sendMessage, getMessages, clearMessages } from "@/lib/chat-api";
import type { Message } from "@shared/schema";

export default function ChatContainer() {
  const [isTyping, setIsTyping] = useState(false);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/memory"],
    refetchInterval: false,
  }) as { data: Message[]; isLoading: boolean };

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: async (variables) => {
      setIsTyping(true);
      // Add user message immediately
      const userMessage: Message = {
        id: Date.now(),
        role: "user",
        content: variables.messages[variables.messages.length - 1].content,
        timestamp: new Date(),
      };
      setLocalMessages(prev => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
      };
      setLocalMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  const handleSendMessage = async (content: string) => {
    const chatMessages = [
      ...localMessages.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      { role: 'user' as const, content },
    ];

    await sendMessageMutation.mutateAsync({ messages: chatMessages });
  };

  const handleNewChat = async () => {
    try {
      await clearMessages();
      setLocalMessages([]);
      setCurrentChatId(Date.now().toString());
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    // In a real app, you'd load messages for the selected chat
  };

  // On first load, call the agent's /start endpoint for a real intro
  useEffect(() => {
    if (localMessages.length === 0 && !isLoading) {
      const apiBase = import.meta.env.VITE_NERDALERT_API_URL || "https://183a-149-88-18-151.ngrok-free.app";
      fetch(`${apiBase}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      })
        .then(res => res.json())
        .then(data => {
          // Add the agent's real response to the chat
          const assistantMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: data.text || data.response || "Hello! I'm NerdAlert, your geek culture companion!",
            timestamp: new Date(),
          };
          setLocalMessages([assistantMessage]);
        })
        .catch(error => {
          console.error("Failed to get agent intro:", error);
          // Fallback message
          const assistantMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: "Hello! I'm NerdAlert, your geek culture companion! What would you like to chat about?",
            timestamp: new Date(),
          };
          setLocalMessages([assistantMessage]);
        });
    }
  }, [localMessages.length, isLoading]);

  // Use local messages for display
  const displayMessages = localMessages.length > 0 ? localMessages : messages;

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
              {import.meta.env.VITE_SHOW_WALLET !== 'false' && <WalletButton />}
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
        <MessageList messages={displayMessages} isTyping={isTyping} isLoading={isLoading} />
      </main>

      {/* Input Area */}
      <footer className="relative z-30 bg-cyber-dark/95 backdrop-blur-sm border-t border-neon-cyan">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={sendMessageMutation.isPending}
          messageCount={displayMessages.length}
        />
      </footer>
    </div>
  );
}
