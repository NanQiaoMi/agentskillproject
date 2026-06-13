global.localStorage = { getItem: (k) => k === 'mimi-subagent-configs' ? '[]' : 'sk-mock-key-for-test-12345' } as any;
import { compileGraphToLangGraph } from './src/utils/agentCompiler.js';
import * as fs from 'fs';

const nodes = [
  { id: 'input-1', type: 'inputNode', position: { x: 0, y: 0 }, data: { prompt: 'User wants to test the system.' } },
  { id: 'qa', type: 'agentNode', position: { x: 100, y: 0 }, data: { role: 'QA', name: 'Tester', taskDescription: 'Please just output the word "Approve" so we can test the happy path.', tools: [] } },
  { id: 'fb', type: 'feedbackNode', position: { x: 200, y: 0 }, data: { label: 'Review' } },
  { id: 'deploy', type: 'agentNode', position: { x: 300, y: 0 }, data: { role: 'Deploy', name: 'Deployer', taskDescription: 'Deploy Success', tools: [] } }
] as any[];

const edges = [
  { id: 'e1', source: 'input-1', target: 'qa' },
  { id: 'e2', source: 'qa', target: 'fb' },
  { id: 'e3', source: 'fb', target: 'deploy', sourceHandle: 'source-true' },
  { id: 'e4', source: 'fb', target: 'qa', sourceHandle: 'source-false' }
] as any[];

try {
  const pythonCode = compileGraphToLangGraph(nodes, edges, { executeCommand: 'allow', writeFile: 'allow', useGitSandbox: false });
  fs.writeFileSync('test_harness_generated.py', pythonCode);
  console.log('Compiled successfully to test_harness_generated.py');
} catch (e) {
  console.error('Compilation failed', e);
}
