import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messageCount: number;
}

export default function MessageInput({ onSendMessage, isLoading, messageCount }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [tokensGenerated, setTokensGenerated] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestStartTime = useRef<number | null>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      requestStartTime.current = Date.now();
      setTokensGenerated(0);
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Update latency when loading state changes
  useEffect(() => {
    if (!isLoading && requestStartTime.current) {
      const responseTime = Date.now() - requestStartTime.current;
      setLatency(responseTime);
      requestStartTime.current = null;
    }
  }, [isLoading]);

  // Simulate token counting (in a real app, this would come from the API)
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setTokensGenerated(prev => prev + Math.floor(Math.random() * 3) + 1);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <div className="container mx-auto px-4 py-4">
      <form onSubmit={handleSubmit} className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about pop culture..."
            disabled={isLoading}
            className="w-full px-4 py-3 text-white terminal-font focus:border-neon-magenta focus:ring-2 focus:ring-neon-magenta/50 bg-black border-neon-cyan cursor-text"
            style={{
              pointerEvents: 'auto',
              cursor: 'text',
              userSelect: 'text',
              backgroundColor: '#000000',
              color: '#ffffff'
            }}
            autoComplete="off"
            autoFocus
          />
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="cyber-button px-6 py-3 cyber-font text-sm retro-button border-neon-cyan transition-all duration-200"
          style={{
            backgroundColor: '#00ff00',
            color: '#000000',
            borderColor: '#00ff00'
          }}
        >
          <span className="mr-2">📡</span>
          {isLoading ? "TRANSMITTING..." : "TRANSMIT"}
        </Button>
      </form>

      {/* Terminal-style status bar */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 terminal-font">
        <div className="flex space-x-4">
          <span>[READY]</span>
          <span>MSGS: {messageCount}</span>
        </div>
        <div className="flex space-x-2">
          {latency && (
            <span>LATENCY: <span className="text-neon-green">{latency}ms</span></span>
          )}
          {isLoading && (
            <span>TOKENS: <span className="text-neon-cyan">{tokensGenerated}</span></span>
          )}
          <span className="terminal-cursor"></span>
        </div>
      </div>
    </div>
  );
}
