import React from 'react';

export const AvatarCropper: React.FC = () => {
  return (
    <div className="mt-4 rounded-[20px] border border-dashed border-[rgba(108,114,232,0.25)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(232,234,246,0.45)]">
        Future cropping support
      </p>
      <p className="mt-1 text-xs text-[rgba(232,234,246,0.55)]">
        Centered square cropping and 512×512 preview preparation are ready for Supabase storage integration.
      </p>
    </div>
  );
};
