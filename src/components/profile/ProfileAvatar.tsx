import React from 'react';
import { motion } from 'motion/react';
import { Camera, User } from 'lucide-react';

interface ProfileAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  showOverlay?: boolean;
  isInteractive?: boolean;
  className?: string;
}

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'U';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  name,
  size = 120,
  showOverlay = false,
  isInteractive = false,
  className = '',
}) => {
  const initials = getInitials(name);
  const hasImage = Boolean(src);

  return (
    <motion.div
      whileHover={isInteractive ? { scale: 1.02, y: -2 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border-[3px] border-transparent bg-gradient-to-br from-[#6c72e8] via-[#8b5cf6] to-[#e8799a] p-[3px] shadow-[0_0_30px_rgba(108,114,232,0.20)] ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgba(13,15,26,0.95)]">
        {hasImage ? (
          <img src={src as string} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(108,114,232,0.16)] to-[rgba(232,121,154,0.18)] text-[rgba(232,234,246,0.95)] text-3xl font-semibold tracking-[0.2em]">
            {initials}
          </div>
        )}

        {showOverlay && isInteractive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.35)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur-md">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
