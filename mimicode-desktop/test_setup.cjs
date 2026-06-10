const fs = require('fs');

const compiler = fs.readFileSync('d:/agentcode/mimicode-desktop/src/utils/agentCompiler.ts', 'utf8');
let code = compiler.replace('export const compileGraphToCrewAI', 'const compileGraphToCrewAI');
code = code.replace(/import .*/g, '');
code = code.replace(/: string/g, '')
           .replace(/: any/g, '')
           .replace(/Node\[\]/g, 'any')
           .replace(/Edge\[\]/g, 'any')
           .replace(/<any>/g, '');

const testCode = `
${code}
const nodes = [
  { id: '1', data: { role: 'A' } },
  { id: '2', data: { role: 'B' } },
  { id: '3', data: { role: 'C' } }
];
const edges = [
  { source: '1', target: '2' },
  { source: '2', target: '3' },
  { source: '3', target: '1' } // cycle
];
console.log(compileGraphToCrewAI(nodes, edges));
`;
fs.writeFileSync('test_compiler.js', testCode);
