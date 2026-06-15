"use client";

import React, { useState, useEffect } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Typography, Avatar, Tag, Button, Input, Dropdown } from 'antd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
    PlusOutlined, 
    MoreOutlined, 
    CheckCircleOutlined, 
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useTheme } from "next-themes";
import { AuroraText } from '@/components/magicui/aurora-text';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.45)' };

// Initial Mock Data
const initialData = {
    tasks: {
        'task-1': { id: 'task-1', content: 'Design landing page', priority: 'High', status: 'To Do', assignee: 'Alex', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
        'task-2': { id: 'task-2', content: 'Setup CI/CD pipeline', priority: 'Critical', status: 'To Do', assignee: 'Sam', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam' },
        'task-3': { id: 'task-3', content: 'Implement auth module', priority: 'Medium', status: 'In Progress', assignee: 'Jordan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' },
        'task-4': { id: 'task-4', content: 'Update payment gateway', priority: 'High', status: 'In Progress', assignee: 'Taylor', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor' },
        'task-5': { id: 'task-5', content: 'Fix navbar bug on mobile', priority: 'Low', status: 'Done', assignee: 'Alex', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    },
    columns: {
        'col-1': { id: 'col-1', title: 'To Do', taskIds: ['task-1', 'task-2'] },
        'col-2': { id: 'col-2', title: 'In Progress', taskIds: ['task-3', 'task-4'] },
        'col-3': { id: 'col-3', title: 'Review', taskIds: [] },
        'col-4': { id: 'col-4', title: 'Done', taskIds: ['task-5'] },
    },
    columnOrder: ['col-1', 'col-2', 'col-3', 'col-4'],
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'Critical': return '#ef4444';
        case 'High': return '#f59e0b';
        case 'Medium': return '#3b82f6';
        default: return '#10b981';
    }
};

export default function KanbanBoardPage() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [data, setData] = useState(initialData);
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const onDragEnd = (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const start = data.columns[source.droppableId as keyof typeof data.columns];
        const finish = data.columns[destination.droppableId as keyof typeof data.columns];

        if (start === finish) {
            const newTaskIds = Array.from(start.taskIds);
            newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, draggableId);

            const newColumn = { ...start, taskIds: newTaskIds };
            setData(prev => ({
                ...prev,
                columns: { ...prev.columns, [newColumn.id]: newColumn }
            }));
            return;
        }

        // Moving to a different column
        const startTaskIds = Array.from(start.taskIds);
        startTaskIds.splice(source.index, 1);
        const newStart = { ...start, taskIds: startTaskIds };

        const finishTaskIds = Array.from(finish.taskIds);
        finishTaskIds.splice(destination.index, 0, draggableId);
        const newFinish = { ...finish, taskIds: finishTaskIds };

        setData(prev => ({
            ...prev,
            columns: {
                ...prev.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            }
        }));
    };

    if (!isBrowser) return null;

    return (
        <CMSLayout 
            title={<AuroraText colors={[themeColor, '#ff6d5a', '#10b981']}>Kanban Board</AuroraText>} 
            subTitle="Manage project tasks with drag-and-drop workflow"
            extra={[
                <Input key="search" prefix={<SearchOutlined />} placeholder="Search tasks..." style={{ width: 200, borderRadius: 20 }} />,
                <Avatar.Group key="users" size="small" max={{ count: 3 }} className="mr-2">
                    <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" />
                    <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sam" />
                    <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan" />
                    <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor" />
                </Avatar.Group>,
                <Button key="add" type="primary" icon={<PlusOutlined />} style={{ backgroundColor: themeColor, borderRadius: 8 }}>New Task</Button>
            ]}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: 'calc(100vh - 180px)' }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    {data.columnOrder.map((columnId) => {
                        const column = data.columns[columnId as keyof typeof data.columns];
                        const tasks = column.taskIds.map(taskId => data.tasks[taskId as keyof typeof data.tasks]);

                        return (
                            <div key={column.id} className="flex flex-col min-w-[320px] max-w-[320px]">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <Text strong className="text-sm">{column.title}</Text>
                                        <Tag className="rounded-full m-0 border-none bg-black/5 dark:bg-white/10 text-xs">
                                            {tasks.length}
                                        </Tag>
                                    </div>
                                    <Button type="text" size="small" icon={<MoreOutlined />} />
                                </div>

                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex-1 rounded-xl p-2 transition-colors duration-200"
                                            style={{
                                                ...glass,
                                                background: snapshot.isDraggingOver 
                                                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                                                    : (isDark ? 'rgba(15,15,23,0.4)' : 'rgba(249,250,251,0.5)'),
                                                minHeight: 150
                                            }}
                                        >
                                            {tasks.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{ ...provided.draggableProps.style }}
                                                        >
                                                            <Card
                                                                size="small"
                                                                hoverable
                                                                className="mb-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                                                                style={{ 
                                                                    borderRadius: 12,
                                                                    boxShadow: snapshot.isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                                                                    transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                    borderLeft: `4px solid ${getPriorityColor(task.priority)}`
                                                                }}
                                                                bodyStyle={{ padding: '12px' }}
                                                            >
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex justify-between items-start">
                                                                        <Tag color={getPriorityColor(task.priority)} className="border-none text-[10px] m-0 rounded-full px-2">
                                                                            {task.priority}
                                                                        </Tag>
                                                                        <Button type="text" size="small" icon={<MoreOutlined />} className="h-5 w-5 opacity-40 hover:opacity-100" />
                                                                    </div>
                                                                    <Text className="text-sm font-medium leading-tight block mb-2 cursor-pointer hover:text-blue-500 transition-colors" onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/pm/tasks/${task.id}`; }}>{task.content}</Text>
                                                                    <div className="flex justify-between items-end mt-auto">
                                                                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                                                            {column.title === 'Done' ? <CheckCircleOutlined className="text-green-500" /> : <ClockCircleOutlined />}
                                                                            <span>{task.id}</span>
                                                                        </div>
                                                                        <div onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/pm/workload?user=${task.assignee}`; }} className="cursor-pointer hover:scale-110 transition-transform">
                                                                            <Avatar src={task.avatar} size="small" className="border-2 border-white dark:border-gray-800" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            <Button type="dashed" block icon={<PlusOutlined />} className="mt-1 opacity-60 hover:opacity-100 border-dashed bg-transparent" style={{ borderRadius: 8 }}>
                                                Add Task
                                            </Button>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </DragDropContext>
            </div>
        </CMSLayout>
    );
}
