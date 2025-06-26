import { useEffect, useRef, useState } from "react";
import NerdAlertAvatar from "./nerdalert-avatar";
import TypingIndicator from "./typing-indicator";
import type { Message } from "@shared/schema";
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
}

interface ProcessedMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  thinkingContent?: string;
}

export default function MessageList({ messages, isTyping, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dotCount, setDotCount] = useState(1);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());

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

  // Function to process messages and extract thinking content
  const processMessages = (messages: Message[]): ProcessedMessage[] => {
    return messages.map((message, idx) => {
      if (message.role !== "assistant") {
        return {
          ...message,
          id: idx,
          timestamp: new Date(),
        };
      }

      const content = message.content;

      // Extract all <think>...</think> blocks for the thinking section
      const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/gi);
      const thinkingContent = thinkMatches ? thinkMatches.map(match => 
        match.replace(/<\/?think>/gi, '').trim()
      ).join('\n\n') : '';

      // For the very first assistant message, show the full content (preserve formatting)
      let cleanContent = content;
      if (idx !== 0) {
        // For the main bubble, show only the content after the last </think> (preserving formatting)
        const lastThinkEnd = content.lastIndexOf('</think>');
        if (lastThinkEnd !== -1) {
          cleanContent = content.substring(lastThinkEnd + 8).trim();
        } else {
          // If no </think> yet, don't show anything in the main bubble
          cleanContent = '';
        }
      }

      return {
        ...message,
        id: idx,
        timestamp: new Date(),
        content: cleanContent,
        thinkingContent: thinkingContent || undefined,
      };
    });
  };

  const processedMessages = processMessages(messages);

  const toggleThinking = (messageId: number) => {
    const newExpanded = new Set(expandedThinking);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedThinking(newExpanded);
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
      {processedMessages.map((message, i) => {
        const isLast = i === processedMessages.length - 1;
        const hasMainContent = message.content && message.content.trim().length > 0;
        const hasThinking = message.thinkingContent && message.thinkingContent.trim().length > 0;

        // For the last assistant message, check if only <think> content is present
        if (
          message.role === "assistant" &&
          isLast
        ) {
          // Remove all <think>...</think> blocks from the content
          const contentWithoutThink = (message.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          if (!contentWithoutThink) {
            // Only <think> content so far, show animation and Show Thinking button
            return (
              <div
                key={message.id}
                className="flex items-start space-x-3 message-enter"
              >
                <NerdAlertAvatar size="sm" />
                <div className="max-w-2xl bg-cyber-gray border-l-4 border-neon-green rounded-r-lg p-4">
                  <div className="flex items-center space-x-2 terminal-font text-terminal-green">
                    <span>THINKING</span>
                    <span className="animate-pulse">{".".repeat(dotCount)}</span>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => toggleThinking(message.id)}
                      className="text-xs text-neon-cyan hover:text-neon-magenta transition-colors duration-200 flex items-center space-x-1"
                    >
                      <span>{expandedThinking.has(message.id) ? '▼' : '▶'}</span>
                      <span>Show Thinking Process</span>
                    </button>
                    {expandedThinking.has(message.id) && (
                      <div className="mt-2 p-3 bg-cyber-dark/50 border border-gray-600 rounded text-xs text-gray-300 font-mono">
                        <div className="text-neon-yellow mb-2 font-bold">🤔 THINKING PROCESS:</div>
                        <div className="whitespace-pre-wrap">{message.thinkingContent}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 terminal-font">
                    {new Date(message.timestamp).toLocaleTimeString()} GMT
                  </div>
                </div>
              </div>
            );
          }
        }
        // Otherwise, render as usual
        if (message.role === "assistant" && !hasMainContent && hasThinking) {
          // For previous assistant messages that are only thinking, hide main bubble
          return null;
        }
        if (!hasMainContent && message.role === "assistant") {
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
                {message.role === "assistant" ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))
                )}
              </div>
              {/* Thinking section for assistant messages */}
              {message.role === "assistant" && message.thinkingContent && (
                <div className="mt-3 border-t border-gray-600 pt-3">
                  <button
                    onClick={() => toggleThinking(message.id)}
                    className="text-xs text-neon-cyan hover:text-neon-magenta transition-colors duration-200 flex items-center space-x-1"
                  >
                    <span>{expandedThinking.has(message.id) ? '▼' : '▶'}</span>
                    <span>Show Thinking Process</span>
                  </button>
                  {expandedThinking.has(message.id) && (
                    <div className="mt-2 p-3 bg-cyber-dark/50 border border-gray-600 rounded text-xs text-gray-300 font-mono">
                      <div className="text-neon-yellow mb-2 font-bold">🤔 THINKING PROCESS:</div>
                      <div className="whitespace-pre-wrap">{message.thinkingContent}</div>
                    </div>
                  )}
                </div>
              )}
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
                <span>PROCESSING</span>
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
