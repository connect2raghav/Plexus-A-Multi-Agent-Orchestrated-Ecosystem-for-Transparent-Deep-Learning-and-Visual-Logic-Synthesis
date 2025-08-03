import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  useReactFlow,
} from 'reactflow';
import { nodeTypes } from './nodes/CustomNodes';
import 'reactflow/dist/style.css';
import '@/styles/nodes.css';

interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
}

const initialNodes: Node[] = [
  { id: '1', data: { label: 'Input Node' }, position: { x: 250, y: 5 }, type: 'input' },
];

const initialEdges: Edge[] = [];

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const { project } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
      const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow'));

      if (!nodeData) return;

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: Date.now().toString(),
        type: nodeData.type,
        position,
        data: {
          label: nodeData.label,
          icon: nodeData.icon,
          details: nodeData.details
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, project]
  );

  return (
    <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_, node) => onNodeSelect(node)}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
        connectionMode="loose"
        selectNodesOnDrag={false}
      >
        <Controls />
        <MiniMap />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default FlowCanvas;