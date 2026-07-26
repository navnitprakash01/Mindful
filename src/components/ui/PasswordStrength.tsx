import React, { memo } from 'react';
import { motion } from 'motion/react';

interface PasswordStrengthProps {
  password: string;
  show?: boolean;
}

const PasswordStrengthInner: React.FC<PasswordStrengthProps> = ({ password, show = true }) => {
  if (!show || !password) return null;

  const checks = [
    { test: password.length >= 8, label: '8+ characters' },
    { test: /[A-Z]/.test(password), label: 'Uppercase' },
    { test: /[a-z]/.test(password), label: 'Lowercase' },
    { test: /\d/.test(password), label: 'Number' },
    { test: /[!@#$%^&*]/.test(password), label: 'Symbol' },
  ];

  const passedCount = checks.filter(c => c.test).length;
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = [
    'bg-[#f28b82]',      // Very Weak
    'bg-[#fbbf24]',      // Weak
    'bg-[#f4a8c0]',      // Fair
    'bg-[#6ee7b7]',      // Strong
    'bg-[#34d399]',      // Very Strong
  ];

  const strengthIndex = Math.min(passedCount, 4);
  const isWeak = passedCount < 3;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[rgba(232,234,246,0.50)]">
          Password Strength
        </span>
        <span className={`text-xs font-semibold ${isWeak ? 'text-[#f28b82]' : 'text-[#34d399]'}`}>
          {strengthLabels[strengthIndex]}
        </span>
      </div>

      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((passedCount) / 5) * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="h-full rounded-full transition-colors duration-300"
          style={{ background: strengthColors[strengthIndex] }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {checks.map((check, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${
              check.test
                ? 'bg-[rgba(52,211,153,0.15)] text-[#34d399]'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.35)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${check.test ? 'bg-current' : 'border border-current'}`} />
            {check.label}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

export const PasswordStrength = memo(PasswordStrengthInner);
PasswordStrength.displayName = 'PasswordStrength';