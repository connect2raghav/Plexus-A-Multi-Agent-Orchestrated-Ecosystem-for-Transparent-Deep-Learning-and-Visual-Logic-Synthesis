import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionMode,
} from 'reactflow';
import { nodeTypes } from './nodes/CustomNodes';
import 'reactflow/dist/style.css';
import '@/styles/nodes.css';

interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
}


const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect }) => {
  const initialEdges: Edge[] = [
    {
      id: 'e-input-hidden',
      source: 'input-1',
      target: 'hidden-1',
      animated: true,
      type: 'smooth'
    },
    {
      id: 'e-hidden-output',
      source: 'hidden-1',
      target: 'output-1',
      animated: true,
      type: 'smooth'
    }
  ];
  const initialNodes: Node[] = [
    {
      id: 'input-1',
      type: 'input',
      data: { 
        count: 3,
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === 'input-1'
                ? { ...node, data: { ...node.data, count: Math.max(1, newCount) } }
                : node
            )
          );
        }
      },
      position: { x: 100, y: 100 }
    },
    {
      id: 'hidden-1',
      type: 'hidden',
      data: { 
        count: 10,
        label: 'Hidden Layer',
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === 'hidden-1'
                ? { ...node, data: { ...node.data, count: Math.max(1, newCount) } }
                : node
            )
          );
        }
      },
      position: { x: 250, y: 100 }
    }
    ,
    {
      id: 'output-1',
      type: 'output',
      data: { 
        count: 1,
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === 'output-1'
                ? { ...node, data: { ...node.data, count: Math.max(1, newCount) } }
                : node
            )
          );
        }
      },
      position: { x: 400, y: 100 }
    }
  ];

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

      // Log the node type for debugging
      console.log('Adding node of type:', nodeData.type);
      console.log('Existing nodes:', nodes.map(n => ({ id: n.id, type: n.type })));

      // Check if trying to add input/output node when one already exists
      const hasInputNode = nodes.some(node => node.type === 'input');
      const hasOutputNode = nodes.some(node => node.type === 'output');

      if (nodeData.type === 'input' && hasInputNode) {
        alert('Only one input node is allowed');
        return;
      }
      if (nodeData.type === 'output' && hasOutputNode) {
        alert('Only one output node is allowed');
        return;
      }

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
          details: nodeData.details,
          ...(['input', 'output', 'hidden'].includes(nodeData.type) ? {
            count: nodeData.type === 'input' ? 784 : nodeData.type === 'output' ? 10 : 128,
            onChange: (newCount: number) => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === newNode.id
                    ? { ...node, data: { ...node.data, count: Math.max(1, newCount) } }
                    : node
                )
              );
            },
          } : {})
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, project, nodes]
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
          type: 'smooth',
          animated: true,
        }}
        connectionMode={ConnectionMode.Loose}
        selectNodesOnDrag={false}
      >
        <Controls />
        {/* <MiniMap /> */}
        <Background color="#aaa" gap={20} />
      </ReactFlow>
    </div>
  );
};

export default FlowCanvas;