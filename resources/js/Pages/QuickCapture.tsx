import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Subtask } from '@/types/task';
import {
    Zap,
    Send,
    CheckCircle2,
    ArrowLeft,
    FolderKanban,
    Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface BoardItem {
    id: number;
    title: string;
    theme_color: string;
}

export default function QuickCapture({
    boards = [],
    recentTasks: initialRecentTasks = [],
}: PageProps<{
    boards: BoardItem[];
    recentTasks: any[];
}>) {
    const defaultBoard =
        boards.find((b) => b.title.toLowerCase().includes('parking')) || boards[0];

    const [boardId, setBoardId] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('taratask_capture_board_id');
            if (saved && boards.some((b) => b.id === Number(saved))) {
                return Number(saved);
            }
        }
        return defaultBoard?.id || 0;
    });

    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [justSaved, setJustSaved] = useState<string | null>(null);
    const [recentTasks, setRecentTasks] = useState<any[]>(initialRecentTasks);

    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        titleInputRef.current?.focus();
    }, []);

    const handleBoardChange = (id: number) => {
        setBoardId(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem('taratask_capture_board_id', String(id));
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);

        // Parse lines starting with "- " or "* " in notes as subtasks checklist
        const lines = notes.split('\n');
        const subtasks: Subtask[] = [];
        const descriptionLines: string[] = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const itemText = trimmed.slice(2).trim();
                if (itemText) {
                    subtasks.push({
                        id: `st-${Date.now()}-${idx}`,
                        title: itemText,
                        completed: false,
                    });
                }
            } else if (trimmed !== '') {
                descriptionLines.push(line);
            }
        });

        try {
            const res = await axios.post(
                '/tasks',
                {
                    title: title.trim(),
                    description: descriptionLines.join('\n').trim() || null,
                    subtasks: subtasks.length > 0 ? subtasks : null,
                    priority: 'medium',
                    status: 'todo',
                    board_id: boardId,
                    due_date: null,
                },
                {
                    headers: { Accept: 'application/json' },
                }
            );

            const activeBoardObj = boards.find((b) => b.id === boardId);
            const createdTask = {
                ...res.data,
                board: activeBoardObj,
            };

            setRecentTasks([createdTask, ...recentTasks.slice(0, 5)]);
            setJustSaved(title.trim());
            setTitle('');
            setNotes('');
            titleInputRef.current?.focus();

            setTimeout(() => {
                setJustSaved(null);
            }, 2500);
        } catch (err) {
            console.error('Quick capture failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBoard = boards.find((b) => b.id === boardId) || defaultBoard;
    const themeColor = selectedBoard?.theme_color || '#10B981';

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-white transition-colors duration-300">
            <Head title="Quick Braindump | taraTask" />

            {/* Compact Mobile-First Header */}
            <header className="px-4 py-3 flex items-center justify-between border-b border-white/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-20">
                <Link
                    href={route('kanban.index', { board_id: boardId })}
                    className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Ke Papan Kanban</span>
                </Link>

                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold tracking-tight">Quick Braindump</span>
                </div>

                <ThemeToggle />
            </header>

            {/* Main Capture Card — Calm, Zero-Pressure UI */}
            <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl p-5 border border-white/60 dark:border-white/10 shadow-xl space-y-4"
                >
                    {/* Target Board Selector Pills */}
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mb-2">
                            <FolderKanban className="w-3.5 h-3.5" />
                            Taruh di Board
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {boards.map((b) => {
                                const active = b.id === boardId;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => handleBoardChange(b.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                            active
                                                ? 'text-white shadow-md scale-[1.02]'
                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                        }`}
                                        style={active ? { backgroundColor: b.theme_color } : {}}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                backgroundColor: active ? '#fff' : b.theme_color,
                                            }}
                                        />
                                        {b.title}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fast Title Input */}
                    <div>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Apa yang sedang terlintas di pikiran Anda? (Tekan Enter)"
                            className="w-full px-4 py-3.5 text-base font-medium rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Optional Notes / Quick Subtasks */}
                    <div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Detail singkat bila perlu (opsional). Awali baris dengan '- ' jika ingin jadi daftar rincian..."
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!title.trim() || isSubmitting}
                        className="w-full py-3.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Send className="w-4 h-4" />
                        <span>
                            {isSubmitting
                                ? 'Menyimpan...'
                                : `Simpan & Lepaskan dari Pikiran`}
                        </span>
                    </button>

                    {justSaved && (
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                                Aman tersimpan: <strong>"{justSaved}"</strong>
                            </span>
                        </div>
                    )}
                </form>

                {/* Recent Braindumps List */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            Baru Saja Ditangkap
                        </h3>
                        <span className="text-[11px] text-gray-400">{recentTasks.length} item</span>
                    </div>

                    {recentTasks.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                            Belum ada catatan. Ketik di atas untuk mulai mengosongkan kepala!
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentTasks.map((t) => (
                                <Link
                                    key={t.id}
                                    href={route('kanban.index', { board_id: t.board_id })}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-700/60 transition-all"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {t.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        t.board?.theme_color || '#3B82F6',
                                                }}
                                            />
                                            <span className="text-[11px] text-gray-400 truncate">
                                                {t.board?.title || 'Board'}
                                            </span>
                                            {Array.isArray(t.subtasks) && t.subtasks.length > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                                    {t.subtasks.length} rincian
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
