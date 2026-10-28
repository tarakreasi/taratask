import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Settings, Palette, FileText, Trash2, Save } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import PrimaryButton from '@/components/PrimaryButton';
import DangerButton from '@/components/DangerButton';
import TextInput from '@/components/TextInput';
import InputLabel from '@/components/InputLabel';
import InputError from '@/components/InputError';

interface Board {
    id: number;
    title: string;
    description: string | null;
    theme_color: string;
    wip_limits: {
        'todo': number | null;
        'in-progress': number | null;
        'in-review': number | null;
        'done': number | null;
    } | null;
}

interface BoardSettingsProps extends PageProps {
    board: Board;
}

export default function BoardSettings({ auth, board }: BoardSettingsProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        title: board.title,
        description: board.description || '',
        theme_color: board.theme_color,
        wip_limits: board.wip_limits || {
            'todo': null,
            'in-progress': 5,
            'in-review': 3,
            'done': null,
        },
    });

    const colorPresets = [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#06B6D4', // Cyan
        '#84CC16', // Lime
    ];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('boards.updateSettings', board.id));
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            post(route('boards.destroy', board.id));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${board.title} - Settings`} />

            <div className="py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold dark:text-white flex items-center gap-2">
                            <Settings className="w-8 h-8" />
                            Board Settings
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Configure {board.title}
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        {/* General Settings */}
                        <div className="glass-card p-6 rounded-xl">
                            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                General Settings
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <InputLabel htmlFor="title" value="Board Name" />
                                    <TextInput
                                        id="title"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.title} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="description" value="Description (Optional)" />
                                    <textarea
                                        id="description"
                                        rows={3}
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="What is this board for?"
                                    />
                                    <InputError message={errors.description} className="mt-2" />
                                </div>
                            </div>
                        </div>

                        {/* Theme Color */}
                        <div className="glass-card p-6 rounded-xl">
                            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
                                <Palette className="w-5 h-5" />
                                Theme Color
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-8 gap-3">
                                    {colorPresets.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setData('theme_color', color)}
                                            className={`w-10 h-10 rounded-lg transition-transform ${data.theme_color === color ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <InputLabel htmlFor="custom_color" value="Custom Color:" />
                                    <input
                                        id="custom_color"
                                        type="color"
                                        value={data.theme_color}
                                        onChange={(e) => setData('theme_color', e.target.value)}
                                        className="h-10 w-20 rounded cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                        {data.theme_color}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* WIP Limits */}
                        <div className="glass-card p-6 rounded-xl">
                            <h2 className="text-xl font-bold mb-4 dark:text-white">
                                WIP Limits (Work In Progress)
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Set maximum number of tasks allowed in each column. Leave empty for no limit.
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['todo', 'in-progress', 'in-review', 'done'].map((column) => (
                                    <div key={column}>
                                        <InputLabel htmlFor={column} value={column.replace('-', ' ').toUpperCase()} />
                                        <TextInput
                                            id={column}
                                            type="number"
                                            min="0"
                                            className="mt-1 block w-full"
                                            value={data.wip_limits[column as keyof typeof data.wip_limits] || ''}
                                            onChange={(e) => setData('wip_limits', {
                                                ...data.wip_limits,
                                                [column]: e.target.value ? parseInt(e.target.value) : null
                                            })}
                                            placeholder="No limit"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <PrimaryButton disabled={processing} className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Save Settings
                            </PrimaryButton>
                        </div>
                    </form>

                    {/* Danger Zone */}
                    <div className="glass-card p-6 rounded-xl mt-6 border-l-4 border-red-500">
                        <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Trash2 className="w-5 h-5" />
                            Danger Zone
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold dark:text-white mb-2">Delete This Board</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Once you delete a board, there is no going back. All tasks, tags, and comments will be permanently deleted.
                                </p>
                                <DangerButton onClick={handleDelete}>
                                    Delete Board
                                </DangerButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
