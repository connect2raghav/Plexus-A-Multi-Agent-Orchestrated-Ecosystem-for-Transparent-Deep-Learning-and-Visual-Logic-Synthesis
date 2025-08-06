# FlowCanvas Modularization

This document describes the modular structure of the FlowCanvas component after refactoring.

## File Structure

### Core Components
- **`FlowCanvas.tsx`** - Main React component for the neural network flow editor
  - Handles ReactFlow canvas interactions
  - Manages node/edge state
  - Integrates with code generation and layout utilities
  - Provides UI for framework selection and code display

### Utilities
- **`CodeGenerator.tsx`** - Neural network code generation utilities
  - `NetworkCodeGenerator` class for converting flow diagrams to code
  - Support for TensorFlow/Keras and PyTorch code generation
  - `CodeGeneratorPanel` React component for code generation UI
  - Topological sorting for proper layer ordering

- **`utils/layoutUtils.ts`** - Graph layout algorithms
  - `getLayoutedElements()` function for auto-arranging nodes
  - Supports horizontal (LR) and vertical (TB) layouts  
  - Uses topological sorting for proper node positioning
  - Configurable spacing and sizing options

### Types
- **`types/neural-network.ts`** - Shared TypeScript definitions
  - Extended node data interfaces
  - Framework and node type definitions
  - Code generation result types
  - Re-exports ReactFlow types for consistency

## Key Benefits

### 1. **Separation of Concerns**
- UI logic separated from business logic
- Code generation isolated from layout algorithms
- Clear interfaces between modules

### 2. **Reusability**
- `NetworkCodeGenerator` can be used independently
- Layout utilities can be reused in other flowchart components
- Type definitions shared across the application

### 3. **Maintainability**
- Easier to test individual modules
- Reduced file size makes code easier to navigate
- Clear dependencies between modules

### 4. **Extensibility**
- Easy to add new frameworks to code generator
- Layout algorithms can be enhanced independently
- New node types can be added with minimal changes

## Usage Example

```tsx
import { NetworkCodeGenerator } from './CodeGenerator';
import { getLayoutedElements } from './utils/layoutUtils';
import { Framework, NeuralNetworkNode } from './types/neural-network';

// Generate code
const generator = new NetworkCodeGenerator(nodes, edges);
const tensorflowCode = generator.generateTensorFlowCode();
const pytorchCode = generator.generatePyTorchCode();

// Auto-layout nodes
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  nodes, 
  edges, 
  'LR'
);
```

## Dependencies

- **ReactFlow** - Flow diagram library
- **@heroui/react** - UI component library
- **lucide-react** - Icon library
- **@iconify/react** - Additional icons

This modular approach makes the codebase more maintainable, testable, and extensible while keeping the original functionality intact.
