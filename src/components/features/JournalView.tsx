import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Save,
  Mic,
  MicOff,
  Star,
  Trash2,
  Search,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  Brain,
  Zap,
  MessageCircle,
  Target,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PageTransition } from '../ui/PageTransition';
import { SkeletonCard, SkeletonListRow } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { staggerContainer, staggerChildFast, fadeUp } from '../../lib/motion';
import { JournalEntry } from '../../types';

const AUTOSAVE_DELAY_MS = 3000;

const moodColors: Record<string, string> = {
  Reflection: '#c0c4ea',
  Gratitude: '#6ee7b7',
  Anxiety: '#fbbf24',
  Growth: '#f4a8c0',
  Mindfulness: '#a78bfa',
};

const tags = ['Reflection', 'Gratitude', 'Anxiety', 'Growth', 'Mindfulness'];
const moods = ['Serene', 'Joyful', 'Calm', 'Anxious', 'Reflective', 'Grateful'];
const PAGE_SIZE = 5;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AIAnalysis {
  dominantEmotion: string;
  dominantScore: number;
  emotions: { name: string; score: number }[];
  summary: string;
  themes: string[];
  suggestedAction: string;
  reflectionPrompt: string;
}

const AutosaveIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => (
  <AnimatePresence mode="wait">
    {status !== 'idle' && (
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1.5 text-[11px] font-mono"
      >
        {status === 'saving' && (
          <>
            <Clock className="w-3 h-3 text-[rgba(232,234,246,0.40)] animate-pulse" />
            <span className="text-[rgba(232,234,246,0.35)]">Autosaving…</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <CheckCircle2 className="w-3 h-3 text-[#34d399]" />
            <span className="text-[rgba(52,211,153,0.70)]">Saved</span>
          </>
        )}
        {status === 'error' && (
          <span className="text-[rgba(242,139,130,0.70)]">Save failed</span>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

interface JournalEntryCardProps {
  entry: JournalEntry;
  isSelected: boolean;
  onSelect: (entry: JournalEntry) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({
  entry,
  isSelected,
  onSelect,
  onFavorite,
  onDelete,
}) => (
  <motion.div
    variants={staggerChildFast}
    onClick={() => onSelect(entry)}
    className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-xs ${
      isSelected
        ? 'bg-[rgba(108,114,232,0.10)] border-[rgba(108,114,232,0.30)]'
        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.20)]'
    }`}
  >
    <div className="flex justify-between items-start mb-1.5">
      <h5 className="font-semibold text-[rgba(232,234,246,0.75)] line-clamp-1 text-xs">
        {entry.title}
      </h5>
      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(entry.id); }}
          aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-0.5 transition-colors ${entry.favorite ? 'text-[#fbbf24]' : 'text-[rgba(232,234,246,0.20)] hover:text-[#fbbf24]'}`}
        >
          <Star className="w-3 h-3 fill-current" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          aria-label="Delete entry"
          className="p-0.5 text-[rgba(232,234,246,0.20)] hover:text-[#f28b82] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
    <p className="text-[rgba(232,234,246,0.35)] line-clamp-2 leading-relaxed mb-2">
      {entry.content}
    </p>
    <div className="flex justify-between items-center">
      <span className="text-[rgba(232,234,246,0.20)] font-mono text-[10px]">
        {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
      <Badge variant="sage" size="sm">{entry.mood}</Badge>
    </div>
  </motion.div>
);

const Waveform: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  const barsRef = useRef<number[]>([0.2, 0.4, 0.6, 0.3, 0.5, 0.7, 0.4, 0.6]);
  const [bars, setBars] = useState(barsRef.current);

  useEffect(() => {
    if (!isRecording) {
      setBars([0.1, 0.2, 0.15, 0.1, 0.15, 0.2, 0.15, 0.1]);
      return;
    }
    const interval = setInterval(() => {
      setBars(barsRef.current.map(() => 0.15 + Math.random() * 0.75));
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="flex items-end gap-1 h-6 ml-2" aria-hidden="true">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          style={{ height: `${height * 100}%` }}
          className="w-1 rounded-full bg-gradient-to-t from-[#6c72e8] to-[#e8799a]"
          animate={{ height: `${height * 100}%` }}
          transition={{ duration: 0.1, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

export const JournalView: React.FC = () => {
  const {
    journalEntries,
    isJournalLoading,
    isJournalSaving,
    journalError,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    toggleFavoriteEntry,
    refreshJournalEntries,
    setCurrentView,
    showToast,
  } = useApp();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('Reflection');
  const [selectedMood, setSelectedMood] = useState('Serene');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [page, setPage] = useState(1);

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedContentRef = useRef('');
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPage(1);
  }, [historySearch]);

  const getDynamicBg = () => {
    const text = (title + ' ' + content).toLowerCase();
    if (text.includes('joy') || text.includes('happy') || text.includes('grateful')) {
      return 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.06) 0%, transparent 60%)';
    }
    if (text.includes('anxious') || text.includes('stress') || text.includes('scared')) {
      return 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 60%)';
    }
    if (text.includes('calm') || text.includes('peace') || text.includes('breath')) {
      return 'radial-gradient(ellipse at 50% 0%, rgba(108,114,232,0.08) 0%, transparent 60%)';
    }
    return 'radial-gradient(ellipse at 50% 0%, rgba(192,196,234,0.05) 0%, transparent 60%)';
  };

  const resetEditor = useCallback(() => {
    setTitle('');
    setContent('');
    setSelectedTag('Reflection');
    setSelectedMood('Serene');
    setEditingEntryId(null);
    setActiveEntryId(null);
    setAiAnalysis(null);
    setSaveStatus('idle');
    setTranscript('');
    setRecordingTime(0);
    setRecognitionError(null);
    savedContentRef.current = '';
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const performAutosave = useCallback(async (currentContent: string, currentTitle: string) => {
    if (!currentContent.trim() || currentContent === savedContentRef.current) return;

    setSaveStatus('saving');
    try {
      const payload = {
        title: currentTitle.trim() || 'Untitled Reflection',
        content: currentContent,
        tags: [selectedTag],
        mood: selectedMood,
        moodScore: aiAnalysis?.dominantScore || 75,
        aiSummary: aiAnalysis?.summary,
        aiAnalysis: aiAnalysis?.reflectionPrompt || aiAnalysis?.summary,
        favorite: false,
        emotion: selectedTag,
      };

      if (editingEntryId) {
        await updateJournalEntry(editingEntryId, payload);
      } else if (activeEntryId) {
        await updateJournalEntry(activeEntryId, payload);
      } else {
        const saved = await addJournalEntry(payload);
        if (saved) {
          setActiveEntryId(saved.id);
          setEditingEntryId(saved.id);
        }
      }
      savedContentRef.current = currentContent;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [selectedTag, selectedMood, aiAnalysis, editingEntryId, activeEntryId, addJournalEntry, updateJournalEntry]);

  useEffect(() => {
    if (!content.trim()) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void performAutosave(content, title);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [content, title, performAutosave]);

  const handleSave = async () => {
    if (!content.trim()) {
      showToast('Please write a few words before saving');
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    try {
      const payload = {
        title: title.trim() || 'Untitled Reflection',
        content,
        tags: [selectedTag],
        mood: selectedMood,
        moodScore: aiAnalysis?.dominantScore || 82,
        aiSummary: aiAnalysis?.summary,
        aiAnalysis: aiAnalysis?.reflectionPrompt || aiAnalysis?.summary,
        favorite: false,
        emotion: selectedTag,
      };
      const savedEntry = editingEntryId
        ? await updateJournalEntry(editingEntryId, payload)
        : await addJournalEntry(payload);
      setActiveEntryId(savedEntry?.id ?? null);
      showToast(editingEntryId ? 'Reflection updated ✨' : 'Reflection saved to your sanctuary ✨');
      resetEditor();
    } catch {
      showToast('Unable to save your reflection right now.');
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!content.trim()) {
      showToast('Write a reflection first for AI analysis');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText: content }),
      });
      const data = await res.json();
      console.log("Gemini response data:", data);
      setAiAnalysis(data);
      showToast('AI Reflection complete ✨');
      if (activeEntryId || editingEntryId) {
        await updateJournalEntry(activeEntryId ?? editingEntryId!, {
          aiSummary: data.summary,
          aiAnalysis: data.reflectionPrompt || data.summary,
          mood: data.dominantEmotion || selectedMood,
          moodScore: data.dominantScore || 82,
          emotion: data.dominantEmotion || selectedTag,
        });
      }
    } catch {
      showToast('AI analysis unavailable, using local synthesis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser');
      setRecognitionError('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = true;
    newRecognition.interimResults = true;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => {
      setIsRecording(true);
      setRecordingTime(0);
      setRecognitionError(null);
      showToast('Listening… Speak your reflection aloud 🎙️');
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    };

    newRecognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);
      if (finalTranscript) {
        setContent((prev) => prev ? prev + ' ' + finalTranscript : finalTranscript);
      }
    };

    newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setRecognitionError('Microphone permission denied. Please allow microphone access.');
        showToast('Microphone permission denied');
      } else if (event.error === 'no-speech') {
        setRecognitionError('No speech detected. Try speaking closer to the microphone.');
      } else {
        setRecognitionError(`Recognition error: ${event.error}`);
      }
      stopRecording();
    };

    newRecognition.onend = () => {
      if (isRecording) {
        newRecognition.start();
      }
    };

    setRecognition(newRecognition);
    newRecognition.start();
  }, [isRecording, showToast]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    showToast('Voice reflection captured');
    setTimeout(() => {
      handleAnalyzeWithAI();
    }, 500);
  }, [recognition, showToast]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const selectEntryForEditing = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setActiveEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setSelectedTag(entry.tags[0] || 'Reflection');
    setSelectedMood(entry.mood);
    savedContentRef.current = entry.content;
setAiAnalysis(
      entry.aiSummary || entry.aiAnalysis
        ? {
            dominantEmotion: entry.emotion || entry.mood || 'Reflective',
            dominantScore: entry.moodScore || 75,
            emotions: entry.aiEmotions || [],
            summary: entry.aiSummary || '',
            themes: entry.aiThemes || [],
            suggestedAction: entry.aiSuggestedAction || '',
            reflectionPrompt: entry.aiReflectionPrompt || entry.aiAnalysis || '',
          }
        : null
    );
    setTranscript('');
    setRecordingTime(0);
    setRecognitionError(null);
  };

  const filteredEntries = journalEntries.filter(
    (e) =>
      e.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      e.content.toLowerCase().includes(historySearch.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const tagColor = moodColors[selectedTag] || '#c0c4ea';

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      Overwhelmed: '😰',
      Anxious: '😟',
      Stressed: '😣',
      Calm: '😌',
      Peaceful: '😊',
      Joyful: '😄',
      Grateful: '🙏',
      Hopeful: '🌱',
      Confident: '💪',
      Reflective: '🤔',
      Sad: '😢',
      Angry: '😠',
      Neutral: '😐',
    };
    return emojiMap[emotion] || '💭';
  };

  return (
    <PageTransition transitionKey="journal">
      <div
        className="min-h-screen pt-24 pb-36 px-4 sm:px-6 md:px-12 max-w-6xl mx-auto flex flex-col transition-all duration-1000"
        style={{ background: getDynamicBg() }}
      >
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.35)] hover:text-[rgba(232,234,246,0.70)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sanctuary
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <AutosaveIndicator status={saveStatus} />
            <Button onClick={() => void refreshJournalEntries()} variant="glass" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Button
              onClick={toggleRecording}
              variant={isRecording ? 'danger' : 'glass'}
              size="sm"
              leftIcon={isRecording ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              className={isRecording ? 'animate-pulse ring-2 ring-[#e8799a]/50' : ''}
            >
              {isRecording ? (
                <>
                  <span className="mr-1">{formatTime(recordingTime)}</span>
                  <Waveform isRecording={isRecording} />
                  Recording…
                </>
              ) : (
                'Voice'
              )}
            </Button>
            <Button
              onClick={() => void handleAnalyzeWithAI()}
              isLoading={isAnalyzing}
              variant="glass"
              size="sm"
              leftIcon={isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#c0c4ea]" />}
            >
              AI Insight
            </Button>
            <Button
              onClick={() => void handleSave()}
              variant="primary"
              size="sm"
              isLoading={isJournalSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {editingEntryId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex-1 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.07)] rounded-[36px] p-7 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.40)] flex flex-col transition-all duration-500">
              <div className="flex flex-wrap gap-2 mb-5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? 'lavender' : 'slate'}
                    onClick={() => setSelectedTag(tag)}
                    className="cursor-pointer transition-all hover:scale-105"
                    style={
                      selectedTag === tag
                        ? { color: moodColors[tag] || '#c0c4ea', borderColor: `${moodColors[tag] || '#c0c4ea'}40` } as React.CSSProperties
                        : {}
                    }
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-1.5 flex-wrap mb-5">
                {moods.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMood(m)}
                    className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
                      selectedMood === m
                        ? 'bg-[rgba(108,114,232,0.20)] text-[#c0c4ea] border-[rgba(108,114,232,0.35)]'
                        : 'bg-transparent text-[rgba(232,234,246,0.30)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title of your reflection..."
                className="w-full bg-transparent border-none focus:outline-none font-display-lg text-3xl sm:text-4xl text-[rgba(232,234,246,0.85)] placeholder:text-[rgba(232,234,246,0.15)] mb-5"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isRecording && transcript ? `Live: ${transcript}` : 'Begin your reflection... What is moving through your mind?'}
                className="w-full flex-1 min-h-[300px] bg-transparent border-none focus:outline-none font-body-md text-base sm:text-lg text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.18)] resize-none leading-[1.8]"
              />

              {isRecording && transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)]"
                >
                  <div className="flex items-center gap-2 text-xs text-[rgba(192,196,234,0.70)] mb-1">
                    <Mic className="w-3 h-3 text-[#6c72e8] animate-pulse" />
                    <span>Live transcription:</span>
                    <span className="font-mono">{formatTime(recordingTime)}</span>
                  </div>
                  <p className="text-[rgba(232,234,246,0.60)] text-sm italic">{transcript}</p>
                </motion.div>
              )}

              {recognitionError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-[rgba(242,139,130,0.10)] border border-[rgba(242,139,130,0.20)]"
                >
                  <p className="text-xs text-[#f28b82]">{recognitionError}</p>
                </motion.div>
              )}

              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-xs text-[rgba(232,234,246,0.25)]">
                <span>{wordCount} words · ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: tagColor, boxShadow: `0 0 6px ${tagColor}80` }}
                  />
                  <span className="italic font-display-lg">Mindful Focus Canvas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-5">
            <AnimatePresence>
              {aiAnalysis && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                >
                  <Card
                    className="p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(108,114,232,0.12) 0%, rgba(13,15,26,0.92) 100%)',
                      border: '1px solid rgba(108,114,232,0.22)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-[#c0c4ea]" />
                      <h4 className="font-display-lg text-base text-[rgba(232,234,246,0.90)]">AI Insight</h4>
                    </div>

                    <div className="space-y-3 text-[12px]">
                      {/* Dominant Emotion + Score */}
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getEmotionEmoji(aiAnalysis.dominantEmotion)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[rgba(232,234,246,0.90)] truncate pr-2">
                              {aiAnalysis.dominantEmotion}
                            </span>
                            <span className="text-[rgba(192,196,234,0.50)] font-mono text-[10px] shrink-0 ml-2">
                              {aiAnalysis.dominantScore}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${aiAnalysis.dominantScore}%` }}
                              className="h-full bg-gradient-to-r from-[#6c72e8] to-[#e8799a] rounded-full"
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Emotion Profile - 2 column grid on desktop */}
                      <div>
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1.5 text-[10px]">Emotion Profile</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(aiAnalysis.emotions || []).slice(0, 4).map((e, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[rgba(232,234,246,0.55)] w-20 truncate font-medium text-[11px]">{e.name}</span>
                              <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${e.score}%` }}
                                  className="h-full bg-gradient-to-r from-[#6c72e8] to-[#e8799a] rounded-full"
                                  transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                                />
                              </div>
                              <span className="text-[rgba(192,196,234,0.50)] font-mono text-[10px] w-8 text-right">{e.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1 text-[10px]">Summary</span>
                        <div className="h-[4.5rem] overflow-hidden">
                          <p className="text-[rgba(192,196,234,0.75)] leading-6 text-xs line-clamp-3 h-full">{aiAnalysis.summary}</p>
                        </div>
                      </div>

                      {/* Key Themes - Compact Chips */}
                      <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1.5 text-[10px]">Key Themes</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(aiAnalysis.themes || []).slice(0, 3).map((t, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(108,114,232,0.15)] text-[#c0c4ea] border border-[rgba(108,114,232,0.25)] whitespace-nowrap"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Suggested Action - Compact Highlighted */}
                      <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)]">
                          <Zap className="w-3 h-3 text-[#6c72e8] shrink-0 mt-0.5" />
                          <p className="text-[rgba(232,234,246,0.85)] text-[12px] leading-snug">{aiAnalysis.suggestedAction || ''}</p>
                        </div>
                      </div>

                      {/* Reflection Prompt - Quote Styling */}
                      <div className="pt-2">
                        <div className="relative pl-3 border-l-2 border-[rgba(108,114,232,0.40)] bg-[rgba(108,114,232,0.05)] rounded-r-xl p-2.5">
                          <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1 text-[10px]">Reflection</span>
                          <p className="text-[rgba(232,234,246,0.70)] italic leading-snug">"{aiAnalysis.reflectionPrompt || ''}"</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="flex flex-col p-5 max-h-[620px]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">Archive</h4>
                <span className="text-xs text-[rgba(232,234,246,0.30)] font-mono">{journalEntries.length} entries</span>
              </div>

              {journalError && (
                <ErrorState
                  message={journalError}
                  onRetry={() => void refreshJournalEntries()}
                  compact
                  className="mb-3"
                />
              )}

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(232,234,246,0.25)]" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-xs text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.25)] pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-[rgba(108,114,232,0.35)] transition-all"
                />
              </div>

              {isJournalLoading ? (
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {[...Array(3)].map((_, i) => (
                    <SkeletonListRow key={i} />
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {pagedEntries.length === 0 ? (
                    historySearch ? (
                      <div className="text-center py-8 text-xs text-[rgba(232,234,246,0.35)]">
                        No entries match "{historySearch}"
                      </div>
                    ) : (
                      <EmptyState
                        icon={<BookOpen className="w-5 h-5" />}
                        title="No reflections yet"
                        description="Your first entry will appear here."
                        compact
                      />
                    )
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2.5"
                    >
                      {pagedEntries.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          isSelected={entry.id === activeEntryId}
                          onSelect={selectEntryForEditing}
                          onFavorite={(id) => void toggleFavoriteEntry(id)}
                          onDelete={(id) => void deleteJournalEntry(id)}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[10px] text-[rgba(232,234,246,0.35)]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="hover:text-[rgba(232,234,246,0.70)] disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span>Page {page}/{totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="hover:text-[rgba(232,234,246,0.70)] disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};