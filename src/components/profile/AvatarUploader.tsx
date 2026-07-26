import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProfileAvatar } from './ProfileAvatar';
import { AvatarCropper } from './AvatarCropper';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  displayName: string;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DIMENSION = 512;
const MAX_DIMENSION = 4096;

const isAcceptedType = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasAllowedMime = ALLOWED_TYPES.includes(file.type);
  return hasAllowedExtension || hasAllowedMime;
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image file.'));
    };

    img.src = objectUrl;
  });
};

const getStoragePathFromUrl = (url?: string | null) => {
  if (!url) return null;

  try {
    const marker = '/storage/v1/object/public/avatars/';
    const index = url.indexOf(marker);
    if (index === -1) {
      return null;
    }

    const encodedPath = url.slice(index + marker.length).split('?')[0];
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
};

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ currentAvatarUrl, displayName }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { updateUserProfile } = useProfile();
  const { showToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storedPath, setStoredPath] = useState<string | null>(() => getStoragePathFromUrl(currentAvatarUrl));

  useEffect(() => {
    const nextValue = currentAvatarUrl ?? null;
    setPreviewUrl(nextValue);
    setStoredPath(getStoragePathFromUrl(nextValue));
  }, [currentAvatarUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAcceptedType(file)) {
      setError('Please choose a PNG, JPG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        setError('Image must be at least 512 × 512 px.');
        event.target.value = '';
        return;
      }

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        setError('Image must be 4096 × 4096 px or smaller.');
        event.target.value = '';
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(15);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) {
        throw new Error('You need to be signed in to upload a profile photo.');
      }

      const userId = userData.user.id;
      const storagePath = `${userId}/${Date.now()}.jpg`;
      setUploadProgress(35);

      const { error: uploadError } = await supabase.storage.from('avatars').upload(storagePath, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(70);

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      const publicUrl = publicUrlData.publicUrl;

      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      if (profileError) {
        throw profileError;
      }

      if (storedPath && storedPath !== storagePath) {
        await supabase.storage.from('avatars').remove([storedPath]);
      }

      updateUserProfile({ avatarUrl: publicUrl });
      setPreviewUrl(publicUrl);
      setStoredPath(storagePath);
      setUploadProgress(100);
      showToast('Profile photo uploaded successfully ✨');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We could not upload that image. Please try again.';
      setError(message);
      setPreviewUrl(currentAvatarUrl ?? null);
      showToast(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(20);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) {
        throw new Error('You need to be signed in to remove your profile photo.');
      }

      if (storedPath) {
        await supabase.storage.from('avatars').remove([storedPath]);
      }

      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userData.user.id);
      if (profileError) {
        throw profileError;
      }

      updateUserProfile({ avatarUrl: '' });
      setPreviewUrl(null);
      setStoredPath(null);
      setUploadProgress(100);
      showToast('Profile photo removed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We could not remove that photo. Please try again.';
      setError(message);
      showToast(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mb-6 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-5 backdrop-blur-[30px]"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar
            src={previewUrl ?? currentAvatarUrl ?? null}
            name={displayName}
            size={120}
            showOverlay
            isInteractive
            className="shrink-0"
          />
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(232,234,246,0.45)]">
              Profile Picture
            </p>
            <p className="mt-2 text-lg font-semibold text-[rgba(232,234,246,0.9)]">
              Add a polished photo to your sanctuary profile.
            </p>
            <p className="mt-1 text-sm text-[rgba(232,234,246,0.55)]">
              PNG, JPG, JPEG, or WebP up to 5 MB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="sr-only"
            aria-label="Upload profile photo"
          />
          <Button
            type="button"
            variant="glass"
            size="sm"
            leftIcon={<UploadCloud className="h-4 w-4" />}
            onClick={() => inputRef.current?.click()}
            isLoading={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Change Photo'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleRemove}
            disabled={isUploading}
          >
            Remove Photo
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[rgba(232,234,246,0.55)]">
            <span>Uploading your avatar</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6c72e8] via-[#8b5cf6] to-[#e8799a] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-[#f28b82]">{error}</p>
      )}

      <AvatarCropper />
    </motion.div>
  );
};
