import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bot,
  GitBranch,
  PlayCircle,
  UserCheck,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Clock3,
  Network,
  Users,
  Combine,
  Repeat2
} from "lucide-react";

export type WorkflowNodeType = "trigger" | "agent" | "condition" | "approval" | "manager" | "manager_slot" | "summary" | "loop";
export type WorkflowNodeRunStatus = "idle" | "running" | "succeeded" | "failed" | "waiting_approval" | "skipped";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  type: WorkflowNodeType;
  status?: WorkflowNodeRunStatus;
  disabled?: boolean;
}

const typeIcon: Record<WorkflowNodeType, React.ElementType> = {
  trigger: PlayCircle,
  agent: Bot,
  condition: GitBranch,
  approval: UserCheck,
  manager: Network,
  manager_slot: Users,
  summary: Combine,
  loop: Repeat2
};

function statusIcon(status?: WorkflowNodeRunStatus) {
  if (status === "succeeded") return CheckCircle2;
  if (status === "failed") return XCircle;
  if (status === "running") return CircleDashed;
  if (status === "waiting_approval") return Clock3;
  if (status === "skipped") return CircleDashed; // or another icon like SkipForward
  return CircleDashed;
}

function statusClass(status?: WorkflowNodeRunStatus) {
  if (status === "succeeded") return "status-success";
  if (status === "failed") return "status-danger";
  if (status === "running") return "status-running";
  if (status === "waiting_approval") return "status-waiting";
  if (status === "skipped") return "status-skipped";
  return "status-idle";
}

export const WorkflowNodeCard = memo(function WorkflowNodeCard({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const TypeIcon = typeIcon[nodeData.type];
  const StatusIcon = statusIcon(nodeData.status);

  return (
    <div className={`workflow-node workflow-node-${nodeData.type} ${selected ? "selected" : ""} ${nodeData.disabled ? "disabled" : ""}`}>
      {/* Input Handle (except for trigger) */}
      {nodeData.type !== "trigger" && (
        <Handle className="node-handle input-handle" type="target" position={Position.Left} />
      )}
      
      <div className="node-topline">
        <span className={`node-type node-type-${nodeData.type}`}>
          <TypeIcon size={15} />
        </span>
        <span className={`node-status ${statusClass(nodeData.status)}`}>
          <StatusIcon size={14} />
        </span>
      </div>
      
      <div className="node-label">{nodeData.label}</div>
      <div className="node-kind">{nodeData.type.toUpperCase()}</div>
      
      {nodeData.type === "trigger" && <span className="node-start-badge">Start</span>}

      {/* Output Handle */}
      <Handle className="node-handle output-handle" type="source" position={Position.Right} />
    </div>
  );
});
