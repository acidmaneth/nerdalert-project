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
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  const handleSendMessage = async (content: string) => {
    const chatMessages = [
      ...messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content },
    ];

    await sendMessageMutation.mutateAsync({ messages: chatMessages });
  };

  const handleNewChat = async () => {
    try {
      await clearMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setCurrentChatId(Date.now().toString());
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    // In a real app, you'd load messages for the selected chat
  };

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      // Add welcome message directly via storage API
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role: "assistant",
          content: "> WELCOME TO THE NEURAL INTERFACE\n> I'M NERDALERT, YOUR CYBERPUNK AI COMPANION\n> READY TO DISCUSS POP CULTURE, TECH, COMICS & MORE\n> TYPE YOUR QUERY TO BEGIN..."
        }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      });
    }
  }, [messages.length, isLoading, queryClient]);

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
        <MessageList messages={messages} isTyping={isTyping} isLoading={isLoading} />
      </main>

      {/* Input Area */}
      <footer className="relative z-30 bg-cyber-dark/95 backdrop-blur-sm border-t border-neon-cyan">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={sendMessageMutation.isPending}
          messageCount={messages.length}
        />
      </footer>
    </div>
  );
}
