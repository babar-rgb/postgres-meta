import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

const nodeWidth = 220;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    // 1. Separate nodes into Connected vs Isolated
    const connectedNodeIds = new Set<string>();
    edges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
    });

    const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id));
    const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

    // 2. Dagre Layout for Connected Nodes (The "Web")
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: 'LR',
        ranksep: 200,
        nodesep: 50
    });

    connectedNodes.forEach((node) => {
        const colCount = (node.data as any).columns?.length || 5;
        const height = 40 + (colCount * 24);
        dagreGraph.setNode(node.id, { width: nodeWidth, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Helper to find layout boundaries
    let maxConnectedY = 0;
    let minConnectedX = Infinity;

    const layoutedConnected = connectedNodes.map((node) => {
        const pos = dagreGraph.node(node.id);
        // Track bounds
        if ((pos.y + pos.height / 2) > maxConnectedY) maxConnectedY = pos.y + pos.height / 2;
        if ((pos.x - nodeWidth / 2) < minConnectedX) minConnectedX = pos.x - nodeWidth / 2;

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: pos.x - nodeWidth / 2,
                y: pos.y - (pos.height / 2),
            },
            style: { opacity: 1 },
        };
    });

    // 3. Grid Layout for Isolated Nodes (The "Inventory")
    // We place them below the connected graph

    // Config
    const COLUMNS = 4;
    const X_SPACING = nodeWidth + 50;
    const OFFSET_Y = maxConnectedY + 150; // Gap between graphs
    const START_X = minConnectedX === Infinity ? 0 : minConnectedX; // Align with left of graph

    const layoutedIsolated = isolatedNodes.map((node, index) => {
        const col = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);

        // Estimate height for spacing
        // const colCount = (node.data as any).columns?.length || 5; // Unused
        // const height = 40 + (colCount * 24); // Unused

        // Simple fixed row height for grid (could be dynamic but getting complex)
        // Taking a generous average to avoid overlap
        const ROW_HEIGHT = 400;

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: START_X + (col * X_SPACING),
                y: OFFSET_Y + (row * ROW_HEIGHT)
            },
            style: { opacity: 1 },
        };
    });

    return { nodes: [...layoutedConnected, ...layoutedIsolated], edges };
};
