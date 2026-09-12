export type CompanionRole = 'assistant' | 'user';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ConversationMessage {
  id: string;
  role: CompanionRole;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  suggestedPathways?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
}

export interface CompanionState {
  messages: ConversationMessage[];
  isLoading: boolean;
  inputValue: string;
  isRecording: boolean;
  voiceEnabled: boolean;
  currentMode: string;
}

export interface CompanionActions {
  sendMessage: (content: string) => void;
  setInputValue: (value: string) => void;
  setIsRecording: (recording: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setCurrentMode: (mode: string) => void;
  clearConversation: () => void;
}