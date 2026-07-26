import React, { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length > 5) score += 1;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  if (!password) return null;

  const strengthLabel = strength < 3 ? 'Weak' : strength < 5 ? 'Medium' : 'Strong';
  const color = 
    strengthLabel === 'Weak' ? 'text-red-400' : 
    strengthLabel === 'Medium' ? 'text-yellow-400' : 'text-emerald-400';

  const renderBlocks = () => {
    const totalBlocks = 5;
    let filledBlocks = 1; // Default for weak
    if (strengthLabel === 'Medium') filledBlocks = 3;
    if (strengthLabel === 'Strong') filledBlocks = 5;

    return (
      <div className="flex gap-[3px]">
        {[...Array(totalBlocks)].map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 w-4 rounded-[2px] transition-colors duration-300 ${i < filledBlocks ? color.replace('text-', 'bg-') : 'bg-white/10'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between mt-3 pl-1 pr-1">
      <span className={`text-[12px] font-medium ${color}`}>{strengthLabel} password</span>
      {renderBlocks()}
    </div>
  );
};
