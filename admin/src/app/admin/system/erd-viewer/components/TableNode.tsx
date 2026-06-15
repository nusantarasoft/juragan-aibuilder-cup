import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface Column {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
}

interface TableNodeData {
  tableName: string;
  domainColor: string;
  columns: Column[];
}

export default function TableNode({ data, isConnectable }: { data: TableNodeData, isConnectable: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 rounded-lg shadow-xl min-w-[200px]" style={{ borderColor: data.domainColor }}>
      {/* Table Header */}
      <div className="px-4 py-2 font-bold text-white rounded-t-sm" style={{ backgroundColor: data.domainColor }}>
        {data.tableName}
      </div>
      
      {/* Table Columns */}
      <div className="flex flex-col py-2">
        {data.columns.map((col, index) => (
          <div key={col.name} className="flex justify-between items-center px-4 py-1 text-sm border-b dark:border-slate-800 last:border-b-0 relative">
            
            {/* Input Handle for Foreign Keys */}
            {col.isForeign && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${data.tableName}-${col.name}-in`}
                style={{ background: '#555', left: -6 }}
                isConnectable={isConnectable}
              />
            )}

            <div className="flex items-center gap-2">
              <span className="w-4">
                {col.isPrimary && '🔑'}
                {col.isForeign && '🔗'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{col.name}</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-mono ml-4">{col.type}</span>
            
            {/* Output Handle for Primary Keys */}
            {col.isPrimary && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${data.tableName}-${col.name}-out`}
                style={{ background: '#555', right: -6 }}
                isConnectable={isConnectable}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
