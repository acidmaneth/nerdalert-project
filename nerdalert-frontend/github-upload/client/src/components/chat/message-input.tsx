import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  messageCount: number;
}

export default function MessageInput({ onSendMessage, isLoading, messageCount }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <form onSubmit={handleSubmit} className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ENTER YOUR QUERY..."
            disabled={isLoading}
            className="cyber-input w-full px-4 py-3 text-terminal-green terminal-font focus:border-neon-magenta focus:ring-2 focus:ring-neon-magenta/50"
          />
          <div className="absolute right-3 top-3 text-neon-cyan">
            <span className="text-xs cyber-font">ENTER</span>
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="cyber-button px-6 py-3 cyber-font text-sm retro-button"
        >
          <span className="mr-2">📡</span>
          {isLoading ? "TRANSMITTING..." : "TRANSMIT"}
        </Button>
      </form>

      {/* Terminal-style status bar */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 terminal-font">
        <div className="flex space-x-4">
          <span>[READY]</span>
          <span>CONN: LOCALHOST:80</span>
          <span>MSGS: {messageCount}</span>
        </div>
        <div className="flex space-x-2">
          <span>LATENCY: <span className="text-neon-green">12ms</span></span>
          <span className="terminal-cursor"></span>
        </div>
      </div>
    </div>
  );
}
