import { Node, Edge } from "reactflow";

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  levelSpacing?: number;
  nodeSpacing?: number;
}

export interface LayoutedElements {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Auto layout utility for positioning nodes in a flowchart
 * Uses topological sorting to arrange nodes in proper levels
 */
export const getLayoutedElements = (
  nodes: Node[], 
  edges: Edge[], 
  direction: 'LR' | 'TB' = 'LR',
  options?: LayoutOptions
): LayoutedElements => {
  const {
    nodeWidth = 200,
    nodeHeight = 100,
    levelSpacing = direction === 'LR' ? 250 : 150,
    nodeSpacing = direction === 'LR' ? 150 : 250
  } = options || {};

  // Build adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  // Build edges
  edges.forEach(edge => {
    const sourceEdges = graph.get(edge.source);
    if (sourceEdges) {
      sourceEdges.push(edge.target);
    }
    const currentInDegree = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, currentInDegree + 1);
  });
  
  // Topological sort to find levels
  const levels: string[][] = [];
  const queue: string[] = [];
  const visited = new Set<string>();
  
  // Find root nodes (nodes with no incoming edges)
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });
  
  // If no root nodes, start with input nodes or first node
  if (queue.length === 0) {
    const inputNode = nodes.find(node => node.type === 'inputLayer' || node.type === 'input');
    if (inputNode) {
      queue.push(inputNode.id);
    } else if (nodes.length > 0) {
      queue.push(nodes[0].id);
    }
  }
  
  // BFS to assign levels
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: string[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      currentLevel.push(nodeId);
      
      // Add children to next level
      const children = graph.get(nodeId) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      });
    }
    
    if (currentLevel.length > 0) {
      levels.push(currentLevel);
    }
  }
  
  // Add any remaining unvisited nodes
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      if (levels.length === 0) {
        levels.push([]);
      }
      levels[levels.length - 1].push(node.id);
    }
  });
  
  // Position nodes
  const layoutedNodes = nodes.map(node => {
    let levelIndex = 0;
    let nodeIndex = 0;
    
    // Find which level this node is in
    for (let i = 0; i < levels.length; i++) {
      const nodeIndexInLevel = levels[i].indexOf(node.id);
      if (nodeIndexInLevel !== -1) {
        levelIndex = i;
        nodeIndex = nodeIndexInLevel;
        break;
      }
    }
    
    const levelNodeCount = levels[levelIndex]?.length || 1;
    const levelHeight = (levelNodeCount - 1) * nodeSpacing;
    const startY = -levelHeight / 2;
    
    let x, y;
    if (direction === 'TB') {
      x = startY + nodeIndex * nodeSpacing;
      y = levelIndex * levelSpacing;
    } else {
      x = levelIndex * levelSpacing;
      y = startY + nodeIndex * nodeSpacing;
    }
    
    return {
      ...node,
      position: { x, y },
    };
  });
  
  return { nodes: layoutedNodes, edges };
};
