import React, { memo } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'glass' | 'solid' | 'flat' | 'glow';
  hoverEffect?: boolean;
  children: React.ReactNode;
  className?: string;
}

const CardInner: React.FC<CardProps> = ({
  variant = 'glass',
  hoverEffect = true,
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    glass:
      'bg-[rgba(255,255,255,0.04)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_60px_rgba(0,0,0,0.40)]',
    solid:
      'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.30)]',
    flat:
      'bg-[rgba(255,255,255,0.03)] border border-transparent',
    glow:
      'bg-[rgba(108,114,232,0.06)] backdrop-blur-[40px] border border-[rgba(108,114,232,0.20)] shadow-[0_0_40px_rgba(108,114,232,0.10),0_20px_60px_rgba(0,0,0,0.40)]',
  };

  return (
    <motion.div
      whileHover={
        hoverEffect
          ? {
              y: -4,
              borderColor: 'rgba(108, 114, 232, 0.22)',
              boxShadow: '0 0 0 1px rgba(108, 114, 232, 0.12), 0 28px 70px rgba(0, 0, 0, 0.50)',
              transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      className={`rounded-[32px] p-6 md:p-8 transition-colors duration-300 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const Card = memo(CardInner);
Card.displayName = 'Card';
