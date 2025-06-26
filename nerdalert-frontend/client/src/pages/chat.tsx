import { useEffect } from "react";
import ChatContainer from "@/components/chat/chat-container";

export default function Chat() {
  useEffect(() => {
    document.title = "NerdAlert - Cyberpunk AI Agent";
  }, []);

  return (
    <div className="min-h-screen bg-cyber-black text-terminal-green overflow-hidden">
      {/* Scanline Effect */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50"></div>
      
      {/* Moving Scanline */}
      <div className="fixed w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50 animate-scanline pointer-events-none z-40"></div>
      
      <ChatContainer />
    </div>
  );
}
