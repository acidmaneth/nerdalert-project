import { useEffect, useRef } from "react";
import NerdAlertAvatar from "./nerdalert-avatar";
import TypingIndicator from "./typing-indicator";
import type { Message } from "@shared/schema";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
}

export default function MessageList({ messages, isTyping, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-neon-cyan text-glow">INITIALIZING NEURAL NETWORK...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start space-x-3 message-enter ${
            message.role === "user" ? "justify-end" : ""
          }`}
        >
          {message.role === "assistant" && <NerdAlertAvatar size="sm" />}
          
          <div
            className={`max-w-2xl ${
              message.role === "user"
                ? "bg-cyber-dark border-r-4 border-neon-magenta rounded-l-lg"
                : "bg-cyber-gray border-l-4 border-neon-green rounded-r-lg"
            } p-4`}
          >

            
            <div
              className={`leading-relaxed terminal-font ${
                message.role === "user" ? "text-white" : "text-terminal-green"
              }`}
            >
              {message.content.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
            
            <div className="text-xs text-gray-500 mt-2 terminal-font">
              {new Date(message.timestamp).toLocaleTimeString()} GMT
            </div>
          </div>

          {message.role === "user" && (
            <div className="w-8 h-8 bg-gradient-to-br from-neon-magenta to-purple-600 flex-shrink-0 mt-1 rounded border border-neon-magenta flex items-center justify-center">
              <div className="text-white text-xs">👤</div>
            </div>
          )}
        </div>
      ))}

      {isTyping && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
