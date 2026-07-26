export type AuthMode = 'signin' | 'register';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
