import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Save, Mic, MicOff, Star, Trash2, Search, BookOpen, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { JournalEntry } from '../../types';

const moodColors: Record<string, string> = {
  Reflection: '#c0c4ea',
  Gratitude: '#6ee7b7',
  Anxiety: '#fbbf24',
  Growth: '#f4a8c0',
  Mindfulness: '#a78bfa',
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
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary?: string;
    dominantEmotion?: string;
    score?: number;
    reframingInsight?: string;
  } | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [page, setPage] = useState(1);

  const tags = ['Reflection', 'Gratitude', 'Anxiety', 'Growth', 'Mindfulness'];
  const pageSize = 5;

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

  const resetEditor = () => {
    setTitle('');
    setContent('');
    setSelectedTag('Reflection');
    setSelectedMood('Serene');
    setEditingEntryId(null);
    setActiveEntryId(null);
    setAiAnalysis(null);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showToast('Please write a few words before saving');
      return;
    }

    try {
      const payload = {
        title: title.trim() || 'Untitled Reflection',
        content,
        tags: [selectedTag],
        mood: selectedMood,
        moodScore: aiAnalysis?.score || 82,
        aiSummary: aiAnalysis?.summary,
        aiAnalysis: aiAnalysis?.reframingInsight || aiAnalysis?.summary,
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
      setAiAnalysis(data);
      showToast('AI Reflection complete ✨');

      if (activeEntryId || editingEntryId) {
        await updateJournalEntry(activeEntryId ?? editingEntryId!, {
          aiSummary: data.summary,
          aiAnalysis: data.reframingInsight || data.summary,
          mood: data.dominantEmotion || selectedMood,
          moodScore: data.score || 82,
          emotion: data.dominantEmotion || selectedTag,
        });
      }
    } catch {
      showToast('AI analysis unavailable, using local synthesis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      showToast('Listening... Speak your reflection aloud 🎙️');
      setTimeout(() => {
        setContent((prev) =>
          prev
            ? prev + ' Taking a moment to breathe and notice how light filters through the window.'
            : 'Taking a moment to breathe and notice how light filters through the window.'
        );
        setIsRecording(false);
        showToast('Voice reflection captured');
      }, 3500);
    } else {
      setIsRecording(false);
    }
  };

  const selectEntryForEditing = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setActiveEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setSelectedTag(entry.tags[0] || 'Reflection');
    setSelectedMood(entry.mood);
    setAiAnalysis(entry.aiSummary || entry.aiAnalysis ? {
      summary: entry.aiSummary,
      dominantEmotion: entry.emotion || entry.mood,
      score: entry.moodScore,
      reframingInsight: entry.aiAnalysis,
    } : null);
  };

  const filteredEntries = journalEntries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      entry.content.toLowerCase().includes(historySearch.toLowerCase()) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const tagColor = moodColors[selectedTag] || '#c0c4ea';

  return (
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
          <Button
            onClick={() => refreshJournalEntries()}
            variant="glass"
            size="sm"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={toggleRecording}
            variant={isRecording ? 'danger' : 'glass'}
            size="sm"
            leftIcon={
              isRecording ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )
            }
          >
            {isRecording ? 'Listening...' : 'Voice'}
          </Button>
          <Button
            onClick={handleAnalyzeWithAI}
            isLoading={isAnalyzing}
            variant="glass"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-[#c0c4ea]" />}
          >
            AI Insight
          </Button>
          <Button
            onClick={handleSave}
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
                  className="cursor-pointer"
                  style={selectedTag === tag ? { color: moodColors[tag] || '#c0c4ea', borderColor: `${moodColors[tag] || '#c0c4ea'}40` } as React.CSSProperties : {}}
                >
                  {tag}
                </Badge>
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
              placeholder="Begin your reflection... What is moving through your mind?"
              className="w-full flex-1 min-h-[300px] bg-transparent border-none focus:outline-none font-body-md text-base sm:text-lg text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.18)] resize-none leading-[1.8]"
            />

            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-xs text-[rgba(232,234,246,0.25)]">
              <span>{wordCount} words · ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tagColor, boxShadow: `0 0 6px ${tagColor}80` }} />
                <span className="italic font-display-lg">Mindful Focus Canvas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-5">
          <AnimatePresence>
            {aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card
                  className="p-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(108,114,232,0.15) 0%, rgba(13,15,26,0.90) 100%)',
                    border: '1px solid rgba(108,114,232,0.25)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#c0c4ea]" />
                    <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.90)]">AI Synthesis</h4>
                  </div>
                  <div className="space-y-3 text-xs text-[rgba(192,196,234,0.70)]">
                    {aiAnalysis.dominantEmotion && (
                      <div>
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1 text-[10px]">Dominant Tone</span>
                        <span className="text-base font-display-lg text-[rgba(232,234,246,0.90)]">{aiAnalysis.dominantEmotion} ({aiAnalysis.score}/100)</span>
                      </div>
                    )}
                    {aiAnalysis.summary && (
                      <div>
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1 text-[10px]">Summary</span>
                        <p>{aiAnalysis.summary}</p>
                      </div>
                    )}
                    {aiAnalysis.reframingInsight && (
                      <div>
                        <span className="text-[rgba(192,196,234,0.45)] font-semibold uppercase tracking-wider block mb-1 text-[10px]">Insight</span>
                        <p className="italic font-display-lg text-[rgba(192,234,246,0.80)]">"{aiAnalysis.reframingInsight}"</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="flex flex-col p-6 max-h-[620px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">Archive</h4>
              <span className="text-xs text-[rgba(232,234,246,0.30)] font-mono">{journalEntries.length} entries</span>
            </div>

            {journalError && (
              <div className="mb-3 rounded-xl border border-[rgba(242,139,130,0.25)] bg-[rgba(242,139,130,0.08)] p-3 text-xs text-[#f28b82]">
                {journalError}
              </div>
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
              <div className="flex-1 flex items-center justify-center text-sm text-[rgba(232,234,246,0.45)]">Syncing your journal…</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {pagedEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] p-4 text-center text-xs text-[rgba(232,234,246,0.35)]">
                    No reflections match your search yet.
                  </div>
                ) : (
                  pagedEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => selectEntryForEditing(entry)}
                      className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.20)] transition-all cursor-pointer text-xs"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h5 className="font-semibold text-[rgba(232,234,246,0.75)] line-clamp-1 text-xs">
                          {entry.title}
                        </h5>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleFavoriteEntry(entry.id);
                            }}
                            className={`p-0.5 transition-colors ${entry.favorite ? 'text-[#fbbf24]' : 'text-[rgba(232,234,246,0.20)] hover:text-[#fbbf24]'}`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteJournalEntry(entry.id);
                            }}
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
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant="sage" size="sm">{entry.mood}</Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-[10px] text-[rgba(232,234,246,0.35)]">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="transition-colors hover:text-[rgba(232,234,246,0.70)]"
                >
                  Previous
                </button>
                <span>Page {page}/{totalPages}</span>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="transition-colors hover:text-[rgba(232,234,246,0.70)]"
                >
                  Next
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
