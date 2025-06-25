import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus, MessageSquare } from "lucide-react";

interface ChatInstance {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  currentChatId?: string;
}

export default function ChatSidebar({ onNewChat, onSelectChat, currentChatId }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mock chat instances for now
  const [chatInstances] = useState<ChatInstance[]>([
    {
      id: "1",
      title: "Current Session",
      lastMessage: "Hello, what can I help you with?",
      timestamp: new Date(),
    }
  ]);

  const handleNewChat = () => {
    onNewChat();
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-neon-cyan hover:text-neon-magenta hover:bg-cyber-gray border border-neon-cyan"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-cyber-dark border-l border-neon-cyan">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg cyber-font text-neon-cyan text-glow">CHAT INSTANCES</h2>
            <Button 
              onClick={handleNewChat}
              className="cyber-button cyber-font text-xs px-3 py-1"
            >
              <Plus className="w-3 h-3 mr-1" />
              NEW CHAT
            </Button>
          </div>

          {/* Chat List */}
          <div className="flex-1 space-y-2">
            {chatInstances.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 rounded border cursor-pointer transition-all hover:border-neon-magenta ${
                  currentChatId === chat.id 
                    ? "border-neon-magenta bg-cyber-gray" 
                    : "border-neon-cyan bg-cyber-black"
                }`}
              >
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-4 h-4 text-neon-cyan mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-terminal-green terminal-font font-medium truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-400 terminal-font truncate mt-1">
                      {chat.lastMessage}
                    </div>
                    <div className="text-xs text-gray-500 terminal-font mt-1">
                      {chat.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-neon-cyan pt-4 mt-4">
            <div className="text-xs text-gray-500 terminal-font text-center">
              <span className="text-neon-green">●</span> Neural Network Active
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}