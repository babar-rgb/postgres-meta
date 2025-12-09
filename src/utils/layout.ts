import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

const nodeWidth = 220;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Direction: 'LR' (Left-to-Right) or 'TB' (Top-to-Bottom)
    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        // We adjust height estimate based on column count if available in data
        const colCount = (node.data as any).columns?.length || 5;
        const height = 40 + (colCount * 24); // header + row * height
        dagreGraph.setNode(node.id, { width: nodeWidth, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - (nodeWithPosition.height / 2),
            },
            style: { opacity: 1 }, // Fade in
        };
    });

    return { nodes: newNodes, edges };
};
