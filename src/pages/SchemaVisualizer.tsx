import { useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    MarkerType,
    Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // Essential styles
import { useTables } from '../hooks/useDb';
import { api } from '../lib/api';
import TableNodeComponent from '../components/flow/TableNode';
import { getLayoutedElements } from '../utils/layout';

const nodeTypes = {
    table: TableNodeComponent,
};

export default function SchemaVisualizer() {
    const { data: tables } = useTables();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Fetch full schema details (columns) for all tables
    useEffect(() => {
        const loadSchema = async () => {
            if (!tables || tables.length === 0) return;

            // Fetch columns for each table (simulated or real batch fetch needed)
            // Since useTables only gives metadata, we might need a richer endpoint 
            // or loop fetch. For now, let's assume we can loop fetch or use a known endpoint.
            // To be safe and fast, we'll try to fetch columns for each table.

            try {
                const introspectionSql = `
                    SELECT 
                        t.table_name,
                        c.column_name,
                        c.data_type,
                        tc.constraint_type
                    FROM information_schema.tables t
                    JOIN information_schema.columns c ON t.table_name = c.table_name
                    LEFT JOIN information_schema.key_column_usage kcu 
                        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
                    LEFT JOIN information_schema.table_constraints tc 
                        ON kcu.constraint_name = tc.constraint_name
                    WHERE t.table_schema = 'public'
                    ORDER BY t.table_name, c.ordinal_position;
                `;

                // We also need foreign keys for edges
                const fkSql = `
                    SELECT
                        tc.table_name AS source_table,
                        kcu.column_name AS source_column,
                        ccu.table_name AS target_table,
                        ccu.column_name AS target_column
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                        AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
                `;

                const [colsRes, fkRes] = await Promise.all([
                    api.executeQuery(introspectionSql),
                    api.executeQuery(fkSql)
                ]);

                // Build Nodes
                const tableMap = new Map();
                (colsRes as any[]).forEach(row => {
                    if (!tableMap.has(row.table_name)) {
                        tableMap.set(row.table_name, []);
                    }
                    const cols = tableMap.get(row.table_name);
                    // Avoid duplicates if LEFT JOIN caused them (PK + FK on same col)
                    if (!cols.find((c: any) => c.name === row.column_name)) {
                        cols.push({
                            name: row.column_name,
                            type: row.data_type,
                            isPk: row.constraint_type === 'PRIMARY KEY'
                        });
                    } else if (row.constraint_type === 'PRIMARY KEY') {
                        // Update existing to PK
                        const c = cols.find((c: any) => c.name === row.column_name);
                        if (c) c.isPk = true;
                    }
                });

                const initialNodes = Array.from(tableMap.entries()).map(([tableName, columns]) => ({
                    id: tableName,
                    type: 'table',
                    data: { label: tableName, columns },
                    position: { x: 0, y: 0 }, // Laid out by dagre later
                }));

                // Build Edges
                const initialEdges = (fkRes as any[]).map((row, idx) => ({
                    id: `e${idx}`,
                    source: row.source_table,
                    target: row.target_table,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#2563eb' },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#2563eb',
                    },
                }));

                // Auto Layout
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                    initialNodes,
                    initialEdges
                );

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);

            } catch (err) {
                console.error("Schema load failed", err);
            }
        };

        loadSchema();
    }, [tables, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    return (
        <div className="h-full w-full bg-[#050505]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                colorMode="dark"
                className="text-white"
                minZoom={0.1}
            >
                <Background color="#222" gap={20} size={1} />
                <Controls className="bg-[#111] border border-[#333] fill-white text-white" />
            </ReactFlow>
        </div>
    );
}
