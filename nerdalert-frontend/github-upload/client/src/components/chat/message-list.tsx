import { useEffect, useRef, useState } from "react";
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
  const [dotCount, setDotCount] = useState(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev % 3) + 1);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDotCount(1);
    }
  }, [isTyping]);

  // Function to clean message content by removing internal thinking tags and fixing formatting
  const cleanMessageContent = (content: string): string => {
    return content
      // Remove thinking tags and their content
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<processing>[\s\S]*?<\/processing>/g, '')
      .replace(/<analysis>[\s\S]*?<\/analysis>/g, '')
      .replace(/<internal>[\s\S]*?<\/internal>/g, '')
      .replace(/<search>[\s\S]*?<\/search>/g, '')
      .replace(/<verify>[\s\S]*?<\/verify>/g, '')
      
      // Remove bracket-style thinking tags
      .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '')
      .replace(/\[PROCESSING\][\s\S]*?\[\/PROCESSING\]/g, '')
      .replace(/\[ANALYSIS\][\s\S]*?\[\/ANALYSIS\]/g, '')
      .replace(/\[INTERNAL\][\s\S]*?\[\/INTERNAL\]/g, '')
      .replace(/\[SEARCH\][\s\S]*?\[\/SEARCH\]/g, '')
      .replace(/\[VERIFY\][\s\S]*?\[\/VERIFY\]/g, '')
      
      // Remove markdown-style thinking tags
      .replace(/\*\*THINKING\*\*[\s\S]*?\*\*\/THINKING\*\*/g, '')
      .replace(/\*\*PROCESSING\*\*[\s\S]*?\*\*\/PROCESSING\*\*/g, '')
      .replace(/\*\*ANALYSIS\*\*[\s\S]*?\*\*\/ANALYSIS\*\*/g, '')
      .replace(/\*\*INTERNAL\*\*[\s\S]*?\*\*\/INTERNAL\*\*/g, '')
      .replace(/\*\*SEARCH\*\*[\s\S]*?\*\*\/SEARCH\*\*/g, '')
      .replace(/\*\*VERIFY\*\*[\s\S]*?\*\*\/VERIFY\*\*/g, '')
      
      // Remove any remaining thinking indicators
      .replace(/THINKING:[\s\S]*?(?=\n|$)/g, '')
      .replace(/PROCESSING:[\s\S]*?(?=\n|$)/g, '')
      .replace(/ANALYSIS:[\s\S]*?(?=\n|$)/g, '')
      .replace(/INTERNAL:[\s\S]*?(?=\n|$)/g, '')
      .replace(/SEARCH:[\s\S]*?(?=\n|$)/g, '')
      .replace(/VERIFY:[\s\S]*?(?=\n|$)/g, '')
      
      // Fix formatting issues
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after punctuation before capital letters
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Ensure space after punctuation before lowercase letters
      .replace(/\s+([.!?,:;])/g, '$1') // Remove spaces before punctuation
      .replace(/([.!?,:;])\s*([A-Z])/g, '$1 $2') // Ensure space after punctuation before capital letters
      .replace(/\s*\n\s*/g, '\n') // Clean up line breaks
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks to max 2
      .trim(); // Remove leading/trailing whitespace
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-neon-cyan text-glow">INITIALIZING NEURAL NETWORK...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
      {messages.map((message, idx) => {
        // Clean the message content
        const cleanContent = cleanMessageContent(message.content);
        
        // Don't render empty messages after cleaning
        if (!cleanContent && message.role === "assistant") {
          return null;
        }
        
        return (
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
                {cleanContent.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2 terminal-font">
                {new Date(message.timestamp).toLocaleTimeString()} GMT
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Agent thinking animation - show when typing and last message is from user */}
      {isTyping && messages.length > 0 && messages[messages.length - 1].role === "user" && (
        <div className="flex items-start space-x-3 message-enter">
          <NerdAlertAvatar size="sm" />
          <div className="max-w-2xl bg-cyber-gray border-l-4 border-neon-green rounded-r-lg p-4">
            <div className="leading-relaxed terminal-font text-terminal-green">
              <div className="flex items-center space-x-2">
                <span>Processing</span>
                <span className="animate-pulse">{".".repeat(dotCount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
