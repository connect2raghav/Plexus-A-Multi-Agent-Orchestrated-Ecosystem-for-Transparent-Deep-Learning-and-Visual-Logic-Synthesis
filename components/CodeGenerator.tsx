import React, { useState } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  RadioGroup, 
  Radio,
  Divider,
  Chip,
  Code,
  Snippet,
  Alert,
  Progress
} from "@heroui/react";

// Code generation utilities
class NetworkCodeGenerator {
  private nodes: Node[];
  private edges: Edge[];
  private nodeMap: Map<string, Node>;
  private topology: string[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map(nodes.map(node => [node.id, node]));
    this.topology = this.buildTopology();
  }

  buildTopology(): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    this.nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    // Build edges
    this.edges.forEach(edge => {
      const sourceEdges = graph.get(edge.source);
      if (sourceEdges) {
        sourceEdges.push(edge.target);
      }
      const currentInDegree = inDegree.get(edge.target) || 0;
      inDegree.set(edge.target, currentInDegree + 1);
    });
    
    // Topological sort
    const queue: string[] = [];
    const sorted: string[] = [];
    
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId) continue;
      
      sorted.push(nodeId);
      
      const neighbors = graph.get(nodeId);
      if (neighbors) {
        neighbors.forEach((neighbor: string) => {
          const currentInDegree = inDegree.get(neighbor) || 0;
          inDegree.set(neighbor, currentInDegree - 1);
          if (inDegree.get(neighbor) === 0) {
            queue.push(neighbor);
          }
        });
      }
    }
    
    return sorted;
  }

  generateTensorFlowJSCode(): string {
    const imports = [
      "import * as tf from '@tensorflow/tfjs';",
      "",
      "// Gender Classification Model with TensorFlow.js",
      "class GenderClassificationModel {",
      "  constructor() {",
      "    this.model = null;",
      "    this.isTraining = false;",
      "  }",
      "",
    ];

    const modelBody = ["  async buildModel() {"];
    
    // Find input node
    const inputNode = this.nodes.find(node => node.type === 'input' || node.type === 'inputLayer' || node.type === 'textInput');
    if (!inputNode) {
      throw new Error("No input layer found");
    }

    // Handle text input for gender classification
    const inputCount = inputNode.data.count || 50; // Max name length
    let inputShape;
    if (inputNode.type === 'textInput') {
      inputShape = `[null, ${inputCount}]`; // Variable sequence length
    } else {
      inputShape = `[null, ${inputCount}]`;
    }
    
    modelBody.push(`    // Gender Classification Model Architecture`);
    modelBody.push(`    const input = tf.input({shape: ${inputShape}});`);
    
    let previousLayer = "input";
    let layerCounter = 1;

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (!node || node.type === 'input' || node.type === 'inputLayer' || node.type === 'textInput' ||
          node.type === 'adam' || node.type === 'sgd' || node.type === 'rmsprop' || 
          node.type === 'bce' || node.type === 'crossentropy' || node.type === 'mse') return;

      const layerName = `layer${layerCounter}`;
      let layerCode = "";

      switch (node.type) {
        case 'embedding':
          const vocabSize = node.data.params?.vocab_size || 10000;
          const embeddingDim = node.data.params?.embedding_dim || node.data.count || 64;
          layerCode = `    const ${layerName} = tf.layers.embedding({inputDim: ${vocabSize}, outputDim: ${embeddingDim}, maskZero: true}).apply(${previousLayer});`;
          break;

        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          const returnSequences = node.data.params?.return_sequences || false;
          layerCode = `    const ${layerName} = tf.layers.lstm({units: ${lstmUnits}, returnSequences: ${returnSequences}, dropout: 0.1}).apply(${previousLayer});`;
          break;

        case 'dense':
          const denseUnits = node.data.params?.units || node.data.count || 128;
          const denseActivation = node.data.params?.activation || 'relu';
          layerCode = `    const ${layerName} = tf.layers.dense({units: ${denseUnits}, activation: '${denseActivation}'}).apply(${previousLayer});`;
          break;
          
        case 'dropout':
          const dropoutRate = node.data.params?.rate || 0.5;
          layerCode = `    const ${layerName} = tf.layers.dropout({rate: ${dropoutRate}}).apply(${previousLayer});`;
          break;

        case 'flatten':
          layerCode = `    const ${layerName} = tf.layers.flatten().apply(${previousLayer});`;
          break;

        case 'batchnorm':
          layerCode = `    const ${layerName} = tf.layers.batchNormalization().apply(${previousLayer});`;
          break;

        case 'output':
        case 'outputLayer':
        case 'textOutput':
          const outputUnits = node.data.count || 1;
          const outputActivation = node.data.params?.activation || (outputUnits === 1 ? 'sigmoid' : 'softmax');
          layerCode = `    const ${layerName} = tf.layers.dense({units: ${outputUnits}, activation: '${outputActivation}', name: 'output'}).apply(${previousLayer});`;
          break;
          
        default:
          layerCode = `    // ${node.type} layer - implementation needed`;
      }

      if (layerCode) {
        modelBody.push(layerCode);
        previousLayer = layerName;
        layerCounter++;
      }
    });

    modelBody.push("");
    modelBody.push(`    this.model = tf.model({inputs: input, outputs: ${previousLayer}});`);
    
    // Add optimizer and loss from nodes
    const optimizerNode = this.nodes.find(node => node.type && ['adam', 'sgd', 'rmsprop'].includes(node.type));
    const lossNode = this.nodes.find(node => node.type && ['bce', 'crossentropy', 'mse'].includes(node.type));
    
    let optimizerCode = "'adam'";
    if (optimizerNode) {
      const params = optimizerNode.data.params || {};
      switch (optimizerNode.type) {
        case 'adam':
          optimizerCode = `tf.train.adam(${params.lr || 0.001})`;
          break;
        case 'sgd':
          optimizerCode = `tf.train.sgd(${params.lr || 0.01})`;
          break;
        case 'rmsprop':
          optimizerCode = `tf.train.rmsprop(${params.lr || 0.01})`;
          break;
      }
    }
    
    let lossCode = "'binaryCrossentropy'";
    if (lossNode) {
      switch (lossNode.type) {
        case 'bce':
          lossCode = "'binaryCrossentropy'";
          break;
        case 'crossentropy':
          lossCode = "'categoricalCrossentropy'";
          break;
        case 'mse':
          lossCode = "'meanSquaredError'";
          break;
      }
    }
    
    modelBody.push("");
    modelBody.push("    // Compile the model");
    modelBody.push("    this.model.compile({");
    modelBody.push(`      optimizer: ${optimizerCode},`);
    modelBody.push(`      loss: ${lossCode},`);
    modelBody.push("      metrics: ['accuracy']");
    modelBody.push("    });");
    modelBody.push("");
    modelBody.push("    console.log('Model built successfully');");
    modelBody.push("    this.model.summary();");
    modelBody.push("  }");

    // Add training method
    const trainingMethod = [
      "",
      "  async train(trainingData, validationData, options = {}) {",
      "    if (!this.model) {",
      "      throw new Error('Model not built. Call buildModel() first.');",
      "    }",
      "",
      "    this.isTraining = true;",
      "    const epochs = options.epochs || 10;",
      "    const batchSize = options.batchSize || 32;",
      "    const validationSplit = options.validationSplit || 0.2;",
      "",
      "    try {",
      "      const history = await this.model.fit(trainingData.x, trainingData.y, {",
      "        epochs: epochs,",
      "        batchSize: batchSize,",
      "        validationSplit: validationSplit,",
      "        shuffle: true,",
      "        callbacks: {",
      "          onEpochEnd: (epoch, logs) => {",
      "            console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(4)} - Accuracy: ${logs.acc.toFixed(4)}`);",
      "            if (logs.val_loss) {",
      "              console.log(`  Val Loss: ${logs.val_loss.toFixed(4)} - Val Accuracy: ${logs.val_acc.toFixed(4)}`);",
      "            }",
      "            // Call progress callback if provided",
      "            if (options.onProgress) {",
      "              options.onProgress(epoch + 1, epochs, logs);",
      "            }",
      "          }",
      "        }",
      "      });",
      "",
      "      this.isTraining = false;",
      "      return history;",
      "    } catch (error) {",
      "      this.isTraining = false;",
      "      throw error;",
      "    }",
      "  }",
      "",
      "  async predict(inputData) {",
      "    if (!this.model) {",
      "      throw new Error('Model not built. Call buildModel() first.');",
      "    }",
      "",
      "    const prediction = this.model.predict(inputData);",
      "    return prediction;",
      "  }",
      "",
      "  getModel() {",
      "    return this.model;",
      "  }",
      "}",
      "",
      "// Usage Example:",
      "// const model = new GenderClassificationModel();",
      "// await model.buildModel();",
      "// ",
      "// // Prepare your data",
      "// const trainingData = {",
      "//   x: tf.tensor2d([...]), // Your input sequences",
      "//   y: tf.tensor2d([...])  // Your labels (0 for male, 1 for female)",
      "// };",
      "//",
      "// // Train the model",
      "// await model.train(trainingData, null, {",
      "//   epochs: 20,",
      "//   batchSize: 32,",
      "//   onProgress: (epoch, totalEpochs, logs) => {",
      "//     console.log(`Training progress: ${epoch}/${totalEpochs}`);",
      "//   }",
      "// });",
      "//",
      "// // Make predictions",
      "// const prediction = await model.predict(tf.tensor2d([[...]]));"
    ];

    return [...imports, ...modelBody, ...trainingMethod].join('\n');
  }

  generateTensorFlowCode(): string {
    const imports = [
      "import tensorflow as tf",
      "from tensorflow.keras import layers, Model",
      "import numpy as np",
      ""
    ];

    const modelBody = ["def create_gender_classification_model():"];
    
    // Find input node - handle both 'input' and 'inputLayer' types
    const inputNode = this.nodes.find(node => node.type === 'input' || node.type === 'inputLayer');
    if (!inputNode) {
      throw new Error("No input layer found");
    }

    // Handle image input shape for gender classification
    const inputCount = inputNode.data.count || 150528; // 224*224*3
    let inputShape;
    if (inputCount === 150528 || inputCount > 100000) {
      inputShape = "(224, 224, 3)"; // RGB image
    } else if (inputCount === 784) {
      inputShape = "(28, 28, 1)"; // Grayscale image
    } else {
      inputShape = `(${inputCount},)`; // Flat input
    }
    
    modelBody.push(`    # Gender Classification Model Architecture`);
    modelBody.push(`    input_layer = layers.Input(shape=${inputShape})`);
    
    let previousLayer = "input_layer";
    let layerCounter = 1;

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (!node || node.type === 'input' || node.type === 'inputLayer' || 
          node.type === 'adam' || node.type === 'sgd' || node.type === 'rmsprop' || 
          node.type === 'bce' || node.type === 'crossentropy' || node.type === 'mse') return;

      const layerName = `layer_${layerCounter}`;
      let layerCode = "";

      switch (node.type) {
        case 'conv2d':
          const filters = node.data.params?.filters || 32;
          const kernelSize = node.data.params?.kernel_size || node.data.params?.kernel || 3;
          const convActivation = node.data.params?.activation || 'relu';
          layerCode = `    ${layerName} = layers.Conv2D(${filters}, (${kernelSize}, ${kernelSize}), activation='${convActivation}', padding='same')(${previousLayer})`;
          break;
          
        case 'maxpool':
          const poolSize = node.data.params?.pool_size || 2;
          layerCode = `    ${layerName} = layers.MaxPooling2D((${poolSize}, ${poolSize}))(${previousLayer})`;
          break;
          
        case 'dropout':
          const dropoutRate = node.data.params?.rate || 0.5;
          layerCode = `    ${layerName} = layers.Dropout(${dropoutRate})(${previousLayer})`;
          break;
          
        case 'activation':
          const activationFunc = node.data.params?.function || 'relu';
          layerCode = `    ${layerName} = layers.Activation('${activationFunc}')(${previousLayer})`;
          break;
        case 'flatten':
          layerCode = `    ${layerName} = layers.Flatten()(${previousLayer})`;
          break;
          
        case 'dense':
          const denseUnits = node.data.params?.units || node.data.count || 128;
          const denseActivation = node.data.params?.activation || 'relu';
          layerCode = `    ${layerName} = layers.Dense(${denseUnits}, activation='${denseActivation}')(${previousLayer})`;
          break;
          
        case 'hidden':
          const units = node.data.count || 128;
          layerCode = `    ${layerName} = layers.Dense(${units}, activation='relu')(${previousLayer})`;
          break;
          
        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          layerCode = `    ${layerName} = layers.LSTM(${lstmUnits})(${previousLayer})`;
          break;
          
        case 'batchnorm':
          layerCode = `    ${layerName} = layers.BatchNormalization()(${previousLayer})`;
          break;
          
        case 'concat':
          // Handle concatenation - would need multiple inputs
          layerCode = `    ${layerName} = layers.Concatenate()(${previousLayer})`;
          break;
          
        case 'output':
        case 'outputLayer':
          const outputUnits = node.data.count || 1;
          const outputActivation = node.data.params?.activation || (outputUnits === 1 ? 'sigmoid' : 'softmax');
          layerCode = `    ${layerName} = layers.Dense(${outputUnits}, activation='${outputActivation}')(${previousLayer})`;
          break;
          
        default:
          layerCode = `    # ${node.type} layer - implementation needed`;
      }

      if (layerCode) {
        modelBody.push(layerCode);
        previousLayer = layerName;
        layerCounter++;
      }
    });

    modelBody.push("");
    modelBody.push(`    model = Model(inputs=input_layer, outputs=${previousLayer})`);
    modelBody.push("    return model");
    modelBody.push("");
    
    // Add model compilation with optimizer and loss from nodes
    const optimizerNode = this.nodes.find(node => node.type && ['adam', 'sgd', 'rmsprop', 'adagrad', 'adamw'].includes(node.type));
    const lossNode = this.nodes.find(node => node.type && ['bce', 'crossentropy', 'mse', 'mae'].includes(node.type));
    const trainingNode = this.nodes.find(node => node.type === 'training_config');
    
    modelBody.push("# Create and compile the model for gender classification");
    modelBody.push("model = create_gender_classification_model()");
    
    let optimizerCode = "adam";
    if (optimizerNode) {
      const params = optimizerNode.data.params || {};
      switch (optimizerNode.type) {
        case 'adam':
          optimizerCode = `tf.keras.optimizers.Adam(learning_rate=${params.lr || 0.001}, beta_1=${params.beta1 || 0.9}, beta_2=${params.beta2 || 0.999})`;
          break;
        case 'sgd':
          optimizerCode = `tf.keras.optimizers.SGD(learning_rate=${params.lr || 0.01}, momentum=${params.momentum || 0.9})`;
          break;
        case 'rmsprop':
          optimizerCode = `tf.keras.optimizers.RMSprop(learning_rate=${params.lr || 0.01})`;
          break;
      }
    }
    
    let lossCode = "binary_crossentropy";
    if (lossNode) {
      switch (lossNode.type) {
        case 'bce':
          lossCode = "binary_crossentropy";
          break;
        case 'crossentropy':
          lossCode = "categorical_crossentropy";
          break;
        case 'mse':
          lossCode = "mean_squared_error";
          break;
        case 'mae':
          lossCode = "mean_absolute_error";
          break;
      }
    }
    
    modelBody.push("model.compile(");
    modelBody.push(`    optimizer=${optimizerCode},`);
    modelBody.push(`    loss='${lossCode}',`);
    modelBody.push("    metrics=['accuracy']");
    modelBody.push(")");
    modelBody.push("");
    modelBody.push("# Model summary");
    modelBody.push("model.summary()");
    modelBody.push("");
    
    // Add training configuration if available
    if (trainingNode) {
      const config = trainingNode.data.config || {};
      modelBody.push("# Training configuration");
      modelBody.push(`epochs = ${config.epochs || 10}`);
      modelBody.push(`batch_size = ${config.batch_size || 32}`);
      modelBody.push(`validation_split = ${config.validation_split || 0.2}`);
      modelBody.push("");
      
      if (config.early_stopping) {
        modelBody.push("# Early stopping callback");
        modelBody.push("from tensorflow.keras.callbacks import EarlyStopping");
        modelBody.push("early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)");
        modelBody.push("callbacks = [early_stopping]");
      } else {
        modelBody.push("callbacks = []");
      }
      modelBody.push("");
      
      modelBody.push("# Training example");
      modelBody.push("# history = model.fit(");
      modelBody.push("#     X_train, y_train,");
      modelBody.push("#     epochs=epochs,");
      modelBody.push("#     batch_size=batch_size,");
      modelBody.push("#     validation_split=validation_split,");
      modelBody.push("#     callbacks=callbacks,");
      modelBody.push("#     verbose=1");
      modelBody.push("# )");
    } else {
      modelBody.push("# Training example");
      modelBody.push("# model.fit(X_train, y_train, epochs=10, batch_size=32, validation_data=(X_val, y_val))");
    }

    return [...imports, ...modelBody].join('\n');
  }

  generatePyTorchCode(): string {
    const imports = [
      "import torch",
      "import torch.nn as nn",
      "import torch.nn.functional as F",
      "import torch.optim as optim",
      "import numpy as np",
      ""
    ];

    const classDefinition = ["class GenderClassificationModel(nn.Module):"];
    const initMethod = ["    def __init__(self):"];
    initMethod.push("        super(GenderClassificationModel, self).__init__()");
    
    const forwardMethod = ["    def forward(self, x):"];

    // Find input node - handle both types
    const inputNode = this.nodes.find(node => node.type === 'input' || node.type === 'inputLayer');
    if (!inputNode) {
      throw new Error("No input layer found");
    }

    let layerCounter = 1;
    let previousTensor = "x";

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (!node || node.type === 'input' || node.type === 'inputLayer' || 
          node.type === 'adam' || node.type === 'sgd' || node.type === 'rmsprop' || 
          node.type === 'bce' || node.type === 'crossentropy' || node.type === 'mse') return;

      const layerName = `layer${layerCounter}`;
      let initCode = "";
      let forwardCode = "";

      switch (node.type) {
        case 'conv2d':
          const filters = node.data.params?.filters || 32;
          const kernelSize = node.data.params?.kernel_size || node.data.params?.kernel || 3;
          const inChannels = layerCounter === 1 ? 3 : 32; // Assuming RGB input, then 32 channels
          initCode = `        self.${layerName} = nn.Conv2d(${inChannels}, ${filters}, ${kernelSize}, padding=1)`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          break;
          
        case 'maxpool':
          const poolSize = node.data.params?.pool_size || 2;
          forwardCode = `        ${previousTensor} = F.max_pool2d(${previousTensor}, ${poolSize})`;
          break;
          
        case 'flatten':
          forwardCode = `        ${previousTensor} = ${previousTensor}.view(${previousTensor}.size(0), -1)`;
          break;
          
        case 'dense':
          const denseUnits = node.data.params?.units || node.data.count || 128;
          const inputFeatures = layerCounter === 1 ? 784 : 128; // Simplified
          initCode = `        self.${layerName} = nn.Linear(${inputFeatures}, ${denseUnits})`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          break;
          
        case 'dropout':
          const dropoutRate = node.data.params?.rate || 0.5;
          forwardCode = `        ${previousTensor} = F.dropout(${previousTensor}, p=${dropoutRate}, training=self.training)`;
          break;
          
        case 'batchnorm':
          forwardCode = `        ${previousTensor} = F.batch_norm(${previousTensor})`;
          break;
          
        case 'activation':
          const activationFunc = node.data.params?.function || 'relu';
          forwardCode = `        ${previousTensor} = F.${activationFunc}(${previousTensor})`;
          break;
          
        case 'hidden':
          const units = node.data.count || 128;
          const prevUnits = layerCounter === 1 ? 784 : 128; // Simplified
          initCode = `        self.${layerName} = nn.Linear(${prevUnits}, ${units})`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          break;
          
        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          initCode = `        self.${layerName} = nn.LSTM(input_size=784, hidden_size=${lstmUnits}, batch_first=True)`;
          forwardCode = `        ${previousTensor}, _ = self.${layerName}(${previousTensor})`;
          break;
          
        case 'output':
        case 'outputLayer':
          const outputUnits = node.data.count || 1;
          const inputUnits = 128; // Simplified
          initCode = `        self.${layerName} = nn.Linear(${inputUnits}, ${outputUnits})`;
          if (outputUnits === 1) {
            forwardCode = `        ${previousTensor} = torch.sigmoid(self.${layerName}(${previousTensor}))`;
          } else {
            forwardCode = `        ${previousTensor} = self.${layerName}(${previousTensor})`;
          }
          break;
          
        default:
          forwardCode = `        # ${node.type} layer - implementation needed`;
      }

      if (initCode) {
        initMethod.push(initCode);
      }
      if (forwardCode) {
        forwardMethod.push(forwardCode);
      }

      layerCounter++;
    });

    forwardMethod.push(`        return ${previousTensor}`);

    // Add optimizer and loss handling
    const optimizerNode = this.nodes.find(node => node.type && ['adam', 'sgd', 'rmsprop', 'adagrad', 'adamw'].includes(node.type));
    const lossNode = this.nodes.find(node => node.type && ['bce', 'crossentropy', 'mse', 'mae'].includes(node.type));
    const trainingNode = this.nodes.find(node => node.type === 'training_config');

    const usage = [
      "",
      "# Create model instance for gender classification",
      "model = GenderClassificationModel()",
      "",
      "# Define loss function"
    ];

    let lossCode = "nn.BCELoss()";
    if (lossNode) {
      switch (lossNode.type) {
        case 'bce':
          lossCode = "nn.BCELoss()";
          break;
        case 'crossentropy':
          lossCode = "nn.CrossEntropyLoss()";
          break;
        case 'mse':
          lossCode = "nn.MSELoss()";
          break;
        case 'mae':
          lossCode = "nn.L1Loss()";
          break;
      }
    }
    
    usage.push(`criterion = ${lossCode}`);
    usage.push("");

    let optimizerCode = "optim.Adam(model.parameters(), lr=0.001)";
    if (optimizerNode) {
      const params = optimizerNode.data.params || {};
      switch (optimizerNode.type) {
        case 'adam':
          optimizerCode = `optim.Adam(model.parameters(), lr=${params.lr || 0.001}, betas=(${params.beta1 || 0.9}, ${params.beta2 || 0.999}))`;
          break;
        case 'sgd':
          optimizerCode = `optim.SGD(model.parameters(), lr=${params.lr || 0.01}, momentum=${params.momentum || 0.9})`;
          break;
        case 'rmsprop':
          optimizerCode = `optim.RMSprop(model.parameters(), lr=${params.lr || 0.01})`;
          break;
      }
    }

    usage.push(`optimizer = ${optimizerCode}`);
    usage.push("");
    usage.push("# Model summary");
    usage.push("print(model)");
    usage.push("");
    
    // Add training configuration
    if (trainingNode) {
      const config = trainingNode.data.config || {};
      usage.push("# Training configuration");
      usage.push(`num_epochs = ${config.epochs || 10}`);
      usage.push(`batch_size = ${config.batch_size || 32}`);
      usage.push(`validation_split = ${config.validation_split || 0.2}`);
      usage.push("");
      usage.push("# Training loop example");
      usage.push("# for epoch in range(num_epochs):");
      usage.push("#     model.train()");
      usage.push("#     running_loss = 0.0");
      usage.push("#     for batch_idx, (data, targets) in enumerate(train_loader):");
      usage.push("#         optimizer.zero_grad()");
      usage.push("#         outputs = model(data)");
      usage.push("#         loss = criterion(outputs, targets)");
      usage.push("#         loss.backward()");
      usage.push("#         optimizer.step()");
      usage.push("#         running_loss += loss.item()");
      usage.push("#");
      usage.push("#     # Validation");
      usage.push("#     model.eval()");
      usage.push("#     val_loss = 0.0");
      usage.push("#     correct = 0");
      usage.push("#     with torch.no_grad():");
      usage.push("#         for data, targets in val_loader:");
      usage.push("#             outputs = model(data)");
      usage.push("#             val_loss += criterion(outputs, targets).item()");
      usage.push("#             pred = outputs.round()");
      usage.push("#             correct += pred.eq(targets.view_as(pred)).sum().item()");
      usage.push("#");
      usage.push("#     print(f'Epoch {epoch+1}/{num_epochs}, Loss: {running_loss/len(train_loader):.4f}, Val Acc: {100.*correct/len(val_loader.dataset):.2f}%')");
    } else {
      usage.push("# Training example");
      usage.push("# for epoch in range(num_epochs):");
      usage.push("#     for batch_idx, (data, targets) in enumerate(train_loader):");
      usage.push("#         optimizer.zero_grad()");
      usage.push("#         outputs = model(data)");
      usage.push("#         loss = criterion(outputs, targets)");
      usage.push("#         loss.backward()");
      usage.push("#         optimizer.step()");
    }

    return [
      ...imports,
      ...classDefinition,
      ...initMethod,
      "",
      ...forwardMethod,
      "",
      ...usage
    ].join('\n');
  }
}

// React component for code generation
interface CodeGeneratorPanelProps {
  nodes: Node[];
  edges: Edge[];
}

const CodeGeneratorPanel: React.FC<CodeGeneratorPanelProps> = ({ nodes, edges }) => {
  const [framework, setFramework] = useState<string>('tensorflow');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generateCode = () => {
    try {
      setError('');
      const generator = new NetworkCodeGenerator(nodes, edges);
      
      let code: string;
      if (framework === 'tensorflow') {
        code = generator.generateTensorFlowCode();
      } else {
        code = generator.generatePyTorchCode();
      }
      
      setGeneratedCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setGeneratedCode('');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadCode = () => {
    const extension = framework === 'tensorflow' ? 'tf.py' : 'torch.py';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural_network_${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <Card className="m-4 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-bold text-foreground">Neural Network Code Generator</h2>
          <p className="text-small text-default-500 mt-1">
            Generate production-ready code from your neural network design
          </p>
        </CardHeader>
        
        <Divider />
        
        <CardBody className="space-y-6">
          {/* Framework Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Select Framework</h3>
            <RadioGroup
              value={framework}
              onValueChange={setFramework}
              orientation="horizontal"
              className="gap-4"
            >
              <Radio value="tensorflow" description="Google's machine learning framework">
                <div className="flex items-center gap-2">
                  <Chip color="warning" variant="flat" size="sm">TF</Chip>
                  TensorFlow/Keras
                </div>
              </Radio>
              <Radio value="pytorch" description="Facebook's deep learning framework">
                <div className="flex items-center gap-2">
                  <Chip color="danger" variant="flat" size="sm">PT</Chip>
                  PyTorch
                </div>
              </Radio>
            </RadioGroup>
          </div>

          <Divider />

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              color="primary"
              size="lg"
              onPress={generateCode}
              className="font-semibold"
              startContent={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
            >
              Generate Code
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert
              color="danger"
              variant="faded"
              title="Code Generation Error"
              description={error}
            />
          )}

          {/* Code Display */}
          {generatedCode && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Generated Code</h3>
                <div className="flex gap-2">
                  <Button
                    color="default"
                    variant="flat"
                    size="sm"
                    onPress={copyToClipboard}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  >
                    Copy
                  </Button>
                  <Button
                    color="success"
                    variant="flat"
                    size="sm"
                    onPress={downloadCode}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  >
                    Download
                  </Button>
                </div>
              </div>
              
              <Snippet 
                hideCopyButton 
                hideSymbol
                className="w-full"
                classNames={{
                  base: "bg-content2",
                  pre: "text-xs font-mono max-h-96 overflow-auto",
                }}
              >
                {generatedCode}
              </Snippet>
            </div>
          )}

          <Divider />

          {/* Instructions */}
          <Card className="bg-content2">
            <CardBody>
              <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Instructions
              </h4>
              <div className="space-y-2 text-sm text-default-600">
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">1</Chip>
                  <span>Make sure your flow has an Input node to define the network entry point</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">2</Chip>
                  <span>Connect nodes in the desired order to create the network architecture</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">3</Chip>
                  <span>Configure node parameters using the node options panel</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">4</Chip>
                  <span>The generator follows the connection flow to create sequential models</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
};

export { NetworkCodeGenerator, CodeGeneratorPanel };