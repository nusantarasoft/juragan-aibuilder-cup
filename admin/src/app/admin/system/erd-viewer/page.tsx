"use client";

import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TableNode from './components/TableNode';
import { Card } from 'antd';

const nodeTypes = {
  tableNode: TableNode,
};

// Colors for domains
const PM_COLOR = '#ef4444';   // Red
const HR_COLOR = '#3b82f6';   // Blue
const DCIM_COLOR = '#10b981'; // Green
const CRM_COLOR = '#f59e0b';  // Yellow

const initialNodes = [
  // --- PROJECT MANAGEMENT ---
  {
    id: 'pm_projects',
    type: 'tableNode',
    position: { x: 50, y: 50 },
    data: {
      tableName: 'pm_projects',
      domainColor: PM_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'name', type: 'varchar' },
        { name: 'status', type: 'varchar' },
        { name: 'manager_id', type: 'uuid', isForeign: true },
      ],
    },
  },
  {
    id: 'pm_tasks',
    type: 'tableNode',
    position: { x: 50, y: 300 },
    data: {
      tableName: 'pm_tasks',
      domainColor: PM_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'project_id', type: 'uuid', isForeign: true },
        { name: 'title', type: 'varchar' },
        { name: 'assignee_id', type: 'uuid', isForeign: true },
      ],
    },
  },
  // --- HUMAN RESOURCES ---
  {
    id: 'hr_employees',
    type: 'tableNode',
    position: { x: 500, y: 150 },
    data: {
      tableName: 'hr_employees',
      domainColor: HR_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'department_id', type: 'uuid', isForeign: true },
        { name: 'first_name', type: 'varchar' },
        { name: 'last_name', type: 'varchar' },
        { name: 'email', type: 'varchar' },
      ],
    },
  },
  {
    id: 'hr_departments',
    type: 'tableNode',
    position: { x: 900, y: 150 },
    data: {
      tableName: 'hr_departments',
      domainColor: HR_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'name', type: 'varchar' },
        { name: 'manager_id', type: 'uuid', isForeign: true },
      ],
    },
  },
  // --- DCIM (Data Center) ---
  {
    id: 'dcim_racks',
    type: 'tableNode',
    position: { x: 500, y: 450 },
    data: {
      tableName: 'dcim_racks',
      domainColor: DCIM_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'name', type: 'varchar' },
        { name: 'ru_height', type: 'int4' },
      ],
    },
  },
  {
    id: 'dcim_devices',
    type: 'tableNode',
    position: { x: 900, y: 450 },
    data: {
      tableName: 'dcim_devices',
      domainColor: DCIM_COLOR,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'rack_id', type: 'uuid', isForeign: true },
        { name: 'hostname', type: 'varchar' },
        { name: 'ip_address', type: 'varchar' },
        { name: 'owner_id', type: 'uuid', isForeign: true },
      ],
    },
  },
];

const initialEdges: Edge[] = [
  // PM Tasks -> PM Projects
  { id: 'e-pm-tasks-project', source: 'pm_projects', target: 'pm_tasks', sourceHandle: 'pm_projects-id-out', targetHandle: 'pm_tasks-project_id-in', animated: true, style: { stroke: PM_COLOR, strokeWidth: 2 } },
  // PM Projects -> HR Employees (Manager)
  { id: 'e-pm-project-manager', source: 'hr_employees', target: 'pm_projects', sourceHandle: 'hr_employees-id-out', targetHandle: 'pm_projects-manager_id-in', animated: false, style: { stroke: HR_COLOR, strokeWidth: 2 } },
  // PM Tasks -> HR Employees (Assignee)
  { id: 'e-pm-task-assignee', source: 'hr_employees', target: 'pm_tasks', sourceHandle: 'hr_employees-id-out', targetHandle: 'pm_tasks-assignee_id-in', animated: false, style: { stroke: HR_COLOR, strokeWidth: 2 } },
  // HR Employees -> HR Departments
  { id: 'e-hr-emp-dept', source: 'hr_departments', target: 'hr_employees', sourceHandle: 'hr_departments-id-out', targetHandle: 'hr_employees-department_id-in', animated: true, style: { stroke: HR_COLOR, strokeWidth: 2 } },
  // DCIM Devices -> DCIM Racks
  { id: 'e-dcim-dev-rack', source: 'dcim_racks', target: 'dcim_devices', sourceHandle: 'dcim_racks-id-out', targetHandle: 'dcim_devices-rack_id-in', animated: true, style: { stroke: DCIM_COLOR, strokeWidth: 2 } },
  // DCIM Devices -> HR Employees (Owner)
  { id: 'e-dcim-dev-owner', source: 'hr_employees', target: 'dcim_devices', sourceHandle: 'hr_employees-id-out', targetHandle: 'dcim_devices-owner_id-in', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' } },
];

export default function ErdViewerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <Card title="Nusantarasoft Entity Relationship Diagram" className="h-full w-full shadow-lg" bodyStyle={{ padding: 0, height: 'calc(100% - 56px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50 dark:bg-slate-950"
        >
          <Controls />
          <MiniMap 
            nodeColor={(n) => {
              if (n.data?.domainColor) return n.data.domainColor as string;
              return '#eee';
            }}
          />
          <Background gap={12} size={1} />
        </ReactFlow>
      </Card>
    </div>
  );
}
