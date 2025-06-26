import NerdAlertAvatar from "./nerdalert-avatar";

export default function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 message-enter">
      <NerdAlertAvatar size="sm" />
      <div className="bg-cyber-gray border-l-4 border-neon-orange p-4 rounded-r-lg">
        <div className="text-neon-orange text-xs cyber-font mb-2">[PROCESSING...]</div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-neon-orange rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-neon-orange rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-neon-orange rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
      </div>
    </div>
  );
}
