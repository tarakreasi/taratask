import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Task } from '@/types/task';
import KanbanBoard from '@/components/KanbanBoard';
import {
    LayoutGrid,
    Plus,
    LogOut,
    PlusCircle,
    Menu,
    X,
    Trash2,
    Edit2,
    Check,
    Camera,
    BarChart3,
    LayoutDashboard,
    ListTodo,
    Settings,
    Search,
    Archive,
    Download,
    Command as CommandIcon,
    Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function Kanban({
    tasks = [],
    boards = [],
    activeBoard,
    tags = [],
    archivedCount = 0,
    showArchived = false,
}: PageProps<{
    tasks: any[];
    boards: any[];
    activeBoard: any;
    tags: any[];
    archivedCount?: number;
    showArchived?: boolean;
}>) {
    const { auth } = usePage<PageProps>().props;
    const [triggerNewTaskKey, setTriggerNewTaskKey] = useState(0);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNewBoardInput, setShowNewBoardInput] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
    const [editingBoardTitle, setEditingBoardTitle] = useState('');
    const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState<number | null>(null);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profileName, setProfileName] = useState(auth.user.name);
    const [profileEmail, setProfileEmail] = useState(auth.user.email);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Search & Command Palette (Ctrl+K) State
    const [searchQuery, setSearchQuery] = useState('');
    const [commandOpen, setCommandOpen] = useState(false);
    const [globalQuery, setGlobalQuery] = useState('');
    const [globalResults, setGlobalResults] = useState<any[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
    const [externalEditTask, setExternalEditTask] = useState<Task | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Analytics State
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({
        avgCycleTime: 0,
        throughput: 0,
        wipCount: 0,
        completedCount: 0,
    });
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

    const fetchAnalytics = async () => {
        setIsLoadingAnalytics(true);
        try {
            const response = await axios.get('/analytics', {
                params: { board_id: activeBoard?.id },
            });
            setAnalyticsData(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        } finally {
            setIsLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        if (showAnalytics) {
            fetchAnalytics();
        }
    }, [showAnalytics, activeBoard?.id]);

    // Ctrl+K / Cmd+K shortcut for Global Search Command Palette
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCommandOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!commandOpen) return;
        const timer = setTimeout(async () => {
            setIsSearchingGlobal(true);
            try {
                const res = await axios.get('/search/tasks', {
                    params: { q: globalQuery },
                });
                setGlobalResults(res.data);
            } catch (error) {
                console.error('Global search failed:', error);
            } finally {
                setIsSearchingGlobal(false);
            }
        }, 180);
        return () => clearTimeout(timer);
    }, [commandOpen, globalQuery]);

    const triggerNewTask = () => {
        setTriggerNewTaskKey((prev) => prev + 1);
    };

    const toggleShowArchived = () => {
        router.get(
            route('kanban.index'),
            {
                board_id: activeBoard?.id,
                show_archived: showArchived ? 0 : 1,
            },
            { preserveState: true }
        );
    };

    const handleCreateBoard = () => {
        if (!newBoardName.trim()) {
            setShowNewBoardInput(false);
            return;
        }
        router.post(
            '/boards',
            {
                title: newBoardName.trim(),
                theme_color:
                    '#' +
                    Math.floor(Math.random() * 16777215)
                        .toString(16)
                        .padStart(6, '0'),
            },
            {
                onSuccess: () => {
                    setNewBoardName('');
                    setShowNewBoardInput(false);
                },
            }
        );
    };

    const handleDeleteBoard = (boardId: number) => {
        router.delete(`/boards/${boardId}`, {
            onSuccess: () => setConfirmDeleteBoardId(null),
        });
    };

    const handleRenameBoard = (boardId: number) => {
        if (!editingBoardTitle.trim()) {
            setEditingBoardId(null);
            return;
        }
        router.put(
            `/boards/${boardId}`,
            { title: editingBoardTitle.trim() },
            {
                onSuccess: () => setEditingBoardId(null),
            }
        );
    };

    const isActiveBoardEmpty = activeBoard && tasks.length === 0;

    const handleProfileUpdate = () => {
        router.patch(
            '/profile',
            {
                name: profileName,
                email: profileEmail,
            },
            {
                onSuccess: () => setShowProfileEdit(false),
            }
        );
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setIsUploadingAvatar(true);
            const formData = new FormData();
            formData.append('avatar', e.target.files[0]);
            formData.append('_method', 'PATCH');

            router.post('/profile', formData, {
                forceFormData: true,
                onSuccess: () => setIsUploadingAvatar(false),
                onError: () => setIsUploadingAvatar(false),
            });
        }
    };

    const themeColor = activeBoard?.theme_color || '#4A90E2';

    const SidebarContent = () => (
        <div className="p-5 flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-6">
                <div
                    className="p-2.5 rounded-xl shadow-lg transition-all duration-300 ring-2 ring-white/20"
                    style={{ backgroundColor: themeColor }}
                >
                    <LayoutGrid className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                        Kanban Crayon Board
                    </h1>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        taraTask
                    </p>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="mb-5 space-y-2">
                <Link
                    href={route('dashboard')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20 dark:border-blue-400/20 transition-all duration-200 group"
                >
                    <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Dashboard
                    </span>
                </Link>

                <Link
                    href={route('my-tasks')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/20 dark:border-purple-400/20 transition-all duration-200 group"
                >
                    <div className="p-1.5 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                        <ListTodo className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        My Tasks
                    </span>
                </Link>

                <Link
                    href={route('tasks.capture')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 dark:border-amber-400/20 transition-all duration-200 group"
                >
                    <div className="p-1.5 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                        <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Quick Braindump
                    </span>
                </Link>
            </div>

            {/* User Profile */}
            <div className="mb-5 p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        {auth.user.avatar_path ? (
                            <img
                                src={`/storage/${auth.user.avatar_path}`}
                                alt={auth.user.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50 dark:ring-white/10"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                {auth.user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </label>
                        {isUploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                            {auth.user.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {auth.user.email}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowProfileEdit(!showProfileEdit)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                        <Edit2
                            className={`w-4 h-4 transition-transform ${
                                showProfileEdit ? 'rotate-45' : ''
                            }`}
                        />
                    </button>
                </div>

                {showProfileEdit && (
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/5 space-y-2">
                        <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Name"
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleProfileUpdate}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                <Check className="w-3 h-3" /> Save
                            </button>
                            <button
                                onClick={() => {
                                    setProfileName(auth.user.name);
                                    setProfileEmail(auth.user.email);
                                    setShowProfileEdit(false);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        <Link
                            method="post"
                            as="button"
                            href={route('logout')}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2"
                        >
                            <LogOut className="w-3 h-3" /> Log Out
                        </Link>
                    </div>
                )}
            </div>

            {/* Boards Section */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        My Boards
                    </h3>
                    <button
                        onClick={() => setShowNewBoardInput(!showNewBoardInput)}
                        className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        title="Create new board"
                    >
                        <PlusCircle
                            className={`w-4 h-4 transition-transform ${
                                showNewBoardInput ? 'rotate-45' : ''
                            }`}
                        />
                    </button>
                </div>

                <div className="space-y-1">
                    {boards?.map((board) => {
                        const isActive = activeBoard?.id === board.id;
                        return (
                            <React.Fragment key={board.id}>
                                <Link
                                    href={route('kanban.index', { board_id: board.id })}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white/60 dark:bg-slate-700/60 shadow-sm'
                                            : 'hover:bg-white/40 dark:hover:bg-slate-800/40'
                                    }`}
                                    style={
                                        isActive
                                            ? {
                                                  borderLeft: `3px solid ${board.theme_color}`,
                                                  marginLeft: '-3px',
                                              }
                                            : {}
                                    }
                                >
                                    <span
                                        className="w-3 h-3 rounded-full ring-2 ring-white/30 dark:ring-black/20 shadow-sm"
                                        style={{ backgroundColor: board.theme_color }}
                                    />
                                    <span
                                        className={`text-sm font-medium truncate ${
                                            isActive
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'
                                        }`}
                                    >
                                        {board.title}
                                    </span>
                                    {isActive && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingBoardId(board.id);
                                            setEditingBoardTitle(board.title);
                                        }}
                                        className={`${isActive ? '' : 'ml-auto'} p-1.5 md:p-1 rounded text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all`}
                                        title="Rename board"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {isActive &&
                                        isActiveBoardEmpty &&
                                        confirmDeleteBoardId !== board.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setConfirmDeleteBoardId(board.id);
                                                }}
                                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                title="Delete empty board"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                </Link>
                                {editingBoardId === board.id && (
                                    <div className="ml-4 mt-1 p-2 rounded-lg bg-blue-50/70 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 space-y-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingBoardTitle}
                                            onChange={(e) => setEditingBoardTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameBoard(board.id);
                                                if (e.key === 'Escape') setEditingBoardId(null);
                                            }}
                                            className="w-full px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                        />
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => handleRenameBoard(board.id)}
                                                className="flex-1 px-2 py-1 text-[11px] font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingBoardId(null)}
                                                className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {confirmDeleteBoardId === board.id && (
                                    <div className="ml-6 mt-1 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                                            Delete "{board.title}"?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteBoard(board.id)}
                                                className="flex-1 px-2 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteBoardId(null)}
                                                className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {showNewBoardInput && (
                    <div className="mt-2 px-1">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Board name..."
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateBoard();
                                if (e.key === 'Escape') {
                                    setNewBoardName('');
                                    setShowNewBoardInput(false);
                                }
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleCreateBoard}
                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setNewBoardName('');
                                    setShowNewBoardInput(false);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Theme</span>
                    <ThemeToggle />
                </div>
                <Link
                    method="post"
                    as="button"
                    href={route('logout')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Log Out
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground transition-colors duration-300">
            <Head title={activeBoard?.title ? `${activeBoard.title} | Kanban` : 'Kanban Board'} />

            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className="w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-white/60 dark:border-white/5 hidden md:flex flex-col h-screen sticky top-0 overflow-hidden shadow-xl shadow-indigo-200/30 dark:shadow-black/20 transition-colors duration-300">
                <SidebarContent />
            </aside>

            <aside
                className={`fixed inset-y-0 left-0 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-gray-200/60 dark:border-white/5 flex flex-col z-50 transform transition-transform duration-300 md:hidden ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                    <X className="w-5 h-5" />
                </button>
                <SidebarContent />
            </aside>

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/50 dark:border-white/5 sticky top-0 z-30 shadow-lg shadow-indigo-100/50 dark:shadow-black/20 transition-colors duration-300">
                    <div className="max-w-[1700px] mx-auto px-3 sm:px-4 md:px-8 py-2.5 md:py-5">
                        <div className="flex items-center justify-between gap-2 md:gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                    <h2 className="text-gray-900 dark:text-white text-base md:text-xl font-bold truncate">
                                        {activeBoard?.title || 'Kanban Board'}
                                    </h2>
                                </div>
                                <p className="text-[11px] md:text-xs text-gray-400">{boards.length} Projects</p>
                            </div>

                            {/* Center Section: Filter & Global Search (Ctrl+K) */}
                            <div className="hidden lg:flex flex-col items-center flex-1 max-w-xl gap-2">
                                <div className="flex items-center gap-2 w-full">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Filter current board..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-gray-100/50 dark:bg-slate-800/50 border border-transparent focus:border-blue-400/50 focus:bg-white dark:focus:bg-slate-800 rounded-full pl-10 pr-4 py-2 text-sm transition-all outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setCommandOpen(true)}
                                        title="Global Search across all boards (Ctrl+K)"
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-xs text-gray-500 dark:text-gray-300 border border-gray-200/60 dark:border-slate-700 transition-all whitespace-nowrap"
                                    >
                                        <CommandIcon className="w-3.5 h-3.5" />
                                        <span>Ctrl+K</span>
                                    </button>
                                </div>
                                {activeBoard && tasks.length > 0 && (
                                    <div className="w-full flex items-center gap-3">
                                        <Progress
                                            value={
                                                (tasks.filter((t) => t.status === 'done').length /
                                                    tasks.length) *
                                                100
                                            }
                                            className="h-1.5"
                                            style={{ '--progress-foreground': themeColor } as any}
                                        />
                                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                                            {Math.round(
                                                (tasks.filter((t) => t.status === 'done').length /
                                                    tasks.length) *
                                                    100
                                            )}
                                            % Complete
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                {/* Mobile Search Trigger */}
                                <button
                                    onClick={() => setCommandOpen(true)}
                                    className="lg:hidden p-1.5 md:p-2 text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-all"
                                    title="Search tasks across all boards"
                                >
                                    <Search className="w-4 h-4 md:w-5 md:h-5" />
                                </button>

                                {activeBoard && (
                                    <>
                                        {/* Toggle Show Archived */}
                                        <button
                                            onClick={toggleShowArchived}
                                            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 md:py-2 rounded-lg text-xs font-medium transition-all ${
                                                showArchived
                                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                            }`}
                                            title="Toggle archived tasks visibility"
                                        >
                                            <Archive className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span className="hidden xl:inline">Archived</span>
                                            {archivedCount > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full bg-gray-200/80 dark:bg-slate-700 text-[10px]">
                                                    {archivedCount}
                                                </span>
                                            )}
                                        </button>

                                        {/* Export Dropdown */}
                                        <div className="relative hidden sm:block">
                                            <button
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-all"
                                                title="Export Tasks (CSV / JSON)"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            {showExportMenu && (
                                                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 z-50">
                                                    <a
                                                        href={`/export/tasks?format=csv&board_id=${activeBoard.id}`}
                                                        onClick={() => setShowExportMenu(false)}
                                                        className="block px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                                    >
                                                        Export Board (CSV)
                                                    </a>
                                                    <a
                                                        href={`/export/tasks?format=json&board_id=${activeBoard.id}`}
                                                        onClick={() => setShowExportMenu(false)}
                                                        className="block px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                                    >
                                                        Export Board (JSON)
                                                    </a>
                                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                                    <a
                                                        href="/export/tasks?format=json"
                                                        onClick={() => setShowExportMenu(false)}
                                                        className="block px-4 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                                                    >
                                                        Backup All Boards (JSON)
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <Link
                                            href={route('boards.settings', activeBoard.id)}
                                            className="p-1.5 md:p-2 text-gray-400 hover:text-purple-500 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-all"
                                            title="Board Settings"
                                        >
                                            <Settings className="w-4 h-4 md:w-5 md:h-5" />
                                        </Link>
                                        <button
                                            onClick={() => setShowAnalytics(true)}
                                            className="hidden sm:inline-flex p-2 text-gray-400 hover:text-blue-500 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-all"
                                            title="Board Analytics"
                                        >
                                            <BarChart3 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={triggerNewTask}
                                    className="hidden sm:flex items-center justify-center gap-2 text-white transition-all px-3 md:px-4 py-2 rounded-lg font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">New Task</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 max-w-[1700px] w-full mx-auto px-2 sm:px-4 md:px-8 py-2 md:py-8 pb-20 md:pb-8 overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeBoard?.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <KanbanBoard
                                key={triggerNewTaskKey}
                                initialTasks={tasks.filter(
                                    (t) =>
                                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        t.description
                                            ?.toLowerCase()
                                            .includes(searchQuery.toLowerCase())
                                )}
                                openModalOnMount={triggerNewTaskKey > 0}
                                themeColor={themeColor}
                                activeBoardId={activeBoard?.id}
                                wipLimits={activeBoard?.wip_limits || {}}
                                availableTags={tags}
                                externalEditTask={externalEditTask}
                                onClearExternalEdit={() => setExternalEditTask(null)}
                            />
                        </motion.div>
                    </AnimatePresence>

                    <AnalyticsPanel
                        open={showAnalytics}
                        onClose={() => setShowAnalytics(false)}
                        data={analyticsData}
                        isLoading={isLoadingAnalytics}
                    />
                </main>

                {/* Global Command Palette (Ctrl+K) */}
                <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
                    <DialogContent className="sm:max-w-[560px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                                <Search className="w-4 h-4 text-blue-500" />
                                Search Across All Boards
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 mt-1">
                            <input
                                autoFocus
                                type="text"
                                value={globalQuery}
                                onChange={(e) => setGlobalQuery(e.target.value)}
                                placeholder="Search task title, description, or tag..."
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                                {isSearchingGlobal ? (
                                    <p className="text-xs text-center text-gray-400 py-6">
                                        Searching...
                                    </p>
                                ) : globalResults.length === 0 ? (
                                    <p className="text-xs text-center text-gray-400 py-6">
                                        No matching tasks found.
                                    </p>
                                ) : (
                                    globalResults.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setCommandOpen(false);
                                                if (item.board_id === activeBoard?.id) {
                                                    setExternalEditTask(item);
                                                } else {
                                                    router.get(route('kanban.index'), {
                                                        board_id: item.board_id,
                                                    });
                                                }
                                            }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between gap-3 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate">
                                                    Board: {item.board?.title || 'Personal'} •{' '}
                                                    Status: {item.status}
                                                </p>
                                            </div>
                                            {item.due_date && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 shrink-0">
                                                    {new Date(item.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <footer className="hidden md:block py-4 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                    <p>© {new Date().getFullYear()} Crayon Board • Made with ❤️</p>
                </footer>

                {/* Mobile Bottom Navigation Bar (< 768px) */}
                <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-slate-800 px-1.5 py-1 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="flex flex-col items-center justify-center py-0.5 px-2.5 rounded-lg text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="text-[9px] font-medium mt-0.5">Boards</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCommandOpen(true)}
                        className="flex flex-col items-center justify-center py-0.5 px-2.5 rounded-lg text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-[9px] font-medium mt-0.5">Search</span>
                    </button>
                    <Link
                        href={route('tasks.capture')}
                        className="flex flex-col items-center justify-center -mt-4 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 active:scale-95 transition-all"
                    >
                        <Zap className="w-4 h-4" />
                        <span className="text-[9px] font-bold mt-0.5">Capture</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(true)}
                        className="flex flex-col items-center justify-center py-0.5 px-2.5 rounded-lg text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-[9px] font-medium mt-0.5">Stats</span>
                    </button>
                    <button
                        type="button"
                        onClick={triggerNewTask}
                        className="flex flex-col items-center justify-center py-0.5 px-2.5 rounded-lg text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
                    >
                        <PlusCircle className="w-4 h-4" style={{ color: themeColor }} />
                        <span className="text-[9px] font-medium mt-0.5">New Task</span>
                    </button>
                </nav>
            </div>
        </div>
    );
}
