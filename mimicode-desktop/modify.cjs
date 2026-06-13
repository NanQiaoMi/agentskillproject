const fs = require('fs');
const content = fs.readFileSync('src/utils/agentCompiler.ts', 'utf8');

const startIndex = content.indexOf('  const nodeVarMap: Record<string, string> = {};');
const endIndex = content.indexOf('        harness = AgentHarness(workflow, project_path)');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find bounds');
  process.exit(1);
}

const prefix = content.slice(0, startIndex);
const suffix = content.slice(endIndex);

let middle = content.slice(startIndex, endIndex);

const origNodeGenStart = middle.indexOf('  nodes.forEach((node) => {');
const origNodeGenEnd = middle.indexOf('  // Generate Python Edges by iterating over NODES');
let origNodeGen = middle.slice(origNodeGenStart + 27, origNodeGenEnd - 6);
origNodeGen = origNodeGen.replace(/workflow\.add_node/g, '${graphVarName}.add_node');

const origEdgeGenStart = middle.indexOf('  nodes.forEach(node => {', origNodeGenEnd);
const origEdgeGenEnd = middle.indexOf('  // Create an edge from ToolNode', origEdgeGenStart);
let origEdgeGen = middle.slice(origEdgeGenStart + 25, origEdgeGenEnd - 6);
origEdgeGen = origEdgeGen.replace(/workflow\.add_edge/g, '${graphVarName}.add_edge');
origEdgeGen = origEdgeGen.replace(/workflow\.add_conditional_edges/g, '${graphVarName}.add_conditional_edges');
origEdgeGen = origEdgeGen.replace(/workflow\.add_node/g, '${graphVarName}.add_node');
origEdgeGen = origEdgeGen.replace('const outEdges = edges.filter(e => e.source === node.id);', 'const outEdges = currentLevelEdges.filter(e => e.source === node.id);');

const newMiddle = `  const nodeVarMap: Record<string, string> = {};
  nodes.forEach(n => {
    nodeVarMap[n.id] = \`node_\${n.id.replace(/-/g, '_')}\`;
  });

  code += \`
def global_tools_node_func(state: AgentState):
    global GLOBAL_TOOLS_NODE_INSTANCE
    return GLOBAL_TOOLS_NODE_INSTANCE.invoke(state)

def tool_router(state: AgentState) -> str:
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.tool_calls:
            return msg.name if msg.name else END
    return END
\`;

  const processGraphLevel = (parentId: string | null | undefined, graphVarName: string) => {
    const currentLevelNodes = nodes.filter(n => (n.parentId || null) === (parentId || null));
    if (currentLevelNodes.length === 0) return;

    const currentLevelEdges = edges.filter(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      return (sourceNode?.parentId || null) === (parentId || null) && 
             (targetNode?.parentId || null) === (parentId || null);
    });

    const inDegree: Record<string, number> = {};
    currentLevelNodes.forEach(n => inDegree[n.id] = 0);
    currentLevelEdges.forEach(e => {
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    let possibleEntries = currentLevelNodes.filter(n => inDegree[n.id] === 0);
    let inputNode = possibleEntries.find(n => n.type === 'inputNode');
    let localEntryNodeId = inputNode ? inputNode.id : (possibleEntries.length > 0 ? possibleEntries[0].id : currentLevelNodes[0].id);

    // 1. Generate Python Nodes
    currentLevelNodes.forEach((node) => {
      const safeNodeId = nodeVarMap[node.id];
      const isParent = nodes.some(n => n.parentId === node.id);

      if (isParent) {
        const subgraphVarName = \`subgraph_\${safeNodeId}\`;
        code += \`\\n\${subgraphVarName} = StateGraph(AgentState)\\n\`;
        processGraphLevel(node.id, subgraphVarName);
        code += \`\${graphVarName}.add_node("\${safeNodeId}", \${subgraphVarName}.compile())\\n\`;
      } else {
${origNodeGen}
      }
    });

    // 2. Generate Python Edges
    currentLevelNodes.forEach(node => {
      const safeSource = nodeVarMap[node.id];
      const isParent = nodes.some(n => n.parentId === node.id);
      
      if (isParent) {
        const outEdges = currentLevelEdges.filter(e => e.source === node.id);
        outEdges.forEach(e => {
          code += \`\${graphVarName}.add_edge("\${safeSource}", "\${nodeVarMap[e.target]}")\\n\`;
        });
      } else {
${origEdgeGen}
      }
    });

    // 3. Add global tool node and tool router back-edges for this level
    code += \`\${graphVarName}.add_node("global_tools_node", global_tools_node_func)\\n\`;
    const agentNodes = currentLevelNodes.filter(n => n.type === 'agentNode' || !n.type);
    if (agentNodes.length > 0) {
      let toolBackRouteMap: string[] = [];
      agentNodes.forEach(n => {
        toolBackRouteMap.push(\`"\${nodeVarMap[n.id]}": "\${nodeVarMap[n.id]}"\`);
      });
      code += \`\${graphVarName}.add_conditional_edges("global_tools_node", tool_router, {
    \${toolBackRouteMap.join(',\\n    ')},
    END: END
})\\n\`;
    }

    if (localEntryNodeId) {
      code += \`\${graphVarName}.set_entry_point("\${nodeVarMap[localEntryNodeId]}")\\n\`;
    }
  };

  processGraphLevel(null, "workflow");

  code += \`
async def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing LangGraph Engine from Visual Builder...")
    if not global_api_key:
        emit_event("error", "System", "No API key configured. Please set your API key in Settings.")
        return
        
    mcp_servers_config_str = \${mcpServersSafe}
    mcp_servers_config = json.loads(mcp_servers_config_str)
    base_tools = [execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, web_search_tool, code_interpreter_tool, generate_repo_map_tool, create_artifact_tool, search_code_tool, delegate_task_tool, spawn_parallel_agents, ask_user_tool, send_to_agent, post_to_taskboard]
    all_tools = list(base_tools)
    
    global GLOBAL_MCP_TOOLS
    GLOBAL_MCP_TOOLS = []

    async with contextlib.AsyncExitStack() as stack:
        for srv in mcp_servers_config:
            try:
                cmd = srv.get("command")
                args = srv.get("args", [])
                env = srv.get("env", None)
                if not cmd: continue
                server_params = StdioServerParameters(command=cmd, args=args, env=env)
                read, write = await stack.enter_async_context(stdio_client(server_params))
                session = await stack.enter_async_context(ClientSession(read, write))
                await session.initialize()
                srv_tools = await load_mcp_tools(session)
                all_tools.extend(srv_tools)
                GLOBAL_MCP_TOOLS.extend(srv_tools)
                emit_event("system", "MCP", f"Loaded tools from {cmd}")
            except Exception as e:
                emit_event("error", "MCP", f"Failed to load MCP server {srv.get('command')}: {e}")

        global GLOBAL_TOOLS_NODE_INSTANCE
        GLOBAL_TOOLS_NODE_INSTANCE = ToolNode(all_tools)

\`;
`;

fs.writeFileSync('src/utils/agentCompiler.ts', prefix + newMiddle + suffix);
console.log("Done");
