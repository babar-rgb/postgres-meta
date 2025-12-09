import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { Key } from 'lucide-react';

export type TableNodeData = {
    label: string;
    columns: { name: string; type: string; isPk: boolean; isFk?: boolean }[];
};

export type TableNode = Node<TableNodeData>;

export default function TableNode({ data }: NodeProps<TableNode>) {
    return (
        <div className="bg-[#0C0C0C] border border-[#333] rounded-md min-w-[200px] shadow-lg overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-[#151515] p-2 border-b border-[#333] flex items-center justify-between">
                <div className="font-semibold text-white text-xs px-1">{data.label}</div>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="!bg-blue-600 !w-2 !h-2" />
            <Handle type="source" position={Position.Right} className="!bg-blue-600 !w-2 !h-2" />

            {/* Columns */}
            <div className="py-2">
                {data.columns.map((col: any) => (
                    <div key={col.name} className="px-3 py-1 text-xs flex items-center justify-between group hover:bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                            {col.isPk && <Key size={10} className="text-yellow-500" />}
                            <span className={col.isPk ? 'text-white font-medium' : 'text-zinc-400'}>{col.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono">{col.type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
