import { compileGraphToCrewAI } from './src/utils/agentCompiler.ts';

const nodes = [
  { id: '1', data: { role: 'A' } },
  { id: '2', data: { role: 'B' } },
  { id: '3', data: { role: 'C' } }
] as any;
const edges = [
  { source: '1', target: '2' },
  { source: '2', target: '3' },
  { source: '3', target: '1' } // cycle
] as any;

console.log(compileGraphToCrewAI(nodes, edges));
