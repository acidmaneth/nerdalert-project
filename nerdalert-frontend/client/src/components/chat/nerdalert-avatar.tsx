import NerdAlertImage from "@assets/NerdAlert3800_1750831460413.png";

interface NerdAlertAvatarProps {
  size?: "sm" | "md" | "lg";
}

export default function NerdAlertAvatar({ size = "md" }: NerdAlertAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
      <img 
        src={NerdAlertImage} 
        alt="NerdAlert AI" 
        className="w-full h-full object-contain pixelated border-2 border-neon-cyan animate-glow rounded"
      />
    </div>
  );
}
