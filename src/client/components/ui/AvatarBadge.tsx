import React from 'react';
import { Avatar } from '../../../shared/types.js';
import { AVATAR_CONFIG } from '../../../shared/constants.js';

interface AvatarBadgeProps {
  avatar: Avatar;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  avatar,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const config = AVATAR_CONFIG[avatar] || AVATAR_CONFIG[Avatar.CYBER_WOLF];

  const sizeStyles = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-3xl',
    xl: 'w-20 h-20 text-5xl',
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-2xl flex items-center justify-center border transition-all duration-300 ${sizeStyles}`}
        style={{
          borderColor: `${config.color}60`,
          backgroundColor: `${config.color}15`,
          boxShadow: `0 0 15px ${config.color}25`,
        }}
      >
        <span>{config.emoji}</span>
      </div>
      {showLabel && (
        <span className="text-xs font-display tracking-wider font-semibold text-gray-300">
          {config.label}
        </span>
      )}
    </div>
  );
};
