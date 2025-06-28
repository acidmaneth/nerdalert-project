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
        src="/3800.png" 
        alt="NerdAlert AI Avatar" 
        className="w-full h-full object-cover rounded border-2 border-cyan-400 animate-glow pixelated"
        style={{ 
          imageRendering: 'pixelated',
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
        }}
        onError={(e) => {
          console.error('Avatar image failed to load');
          // Show a fallback
          e.currentTarget.style.display = 'none';
        }}
        onLoad={() => {
          console.log('Avatar image loaded successfully');
        }}
      />
    </div>
  );
}
