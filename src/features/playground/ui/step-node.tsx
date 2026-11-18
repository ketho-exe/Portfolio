"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../engine";
import { NODE_HEIGHT, NODE_WIDTH } from "./layout";
import type { UiStatus } from "./replay";

export type StepNodeData = {
  label: string;
  nodeType: NodeType;
  status: UiStatus;
  selected: boolean;
  simulated: boolean;
};
export type StepNode = Node<StepNodeData, "step">;

export const typeLabel: Record<NodeType, string> = {
  trigger: "Trigger",
  validate: "Validate",
  condition: "Condition",
  transform: "Transform",
  classify: "Classify",
  integration: "Integration",
  output: "Output",
};

export const statusGlyph: Record<UiStatus, string> = {
  idle: "○",
  running: "●",
  success: "✓",
  error: "✕",
  skipped: "–",
};

const statusStyle: Record<UiStatus, string> = {
  idle: "border-border bg-surface",
  running: "border-accent bg-surface shadow-[0_0_0_4px_var(--accent-soft)]",
  success: "border-accent/70 bg-accent-soft",
  error: "border-danger bg-danger-soft",
  skipped: "border-dashed border-border bg-surface opacity-45",
};

const glyphColour: Record<UiStatus, string> = {
  idle: "text-muted",
  running: "text-accent animate-pulse",
  success: "text-accent",
  error: "text-danger",
  skipped: "text-muted",
};

const handle = "!size-1.5 !min-w-0 !min-h-0 !border-0 !bg-muted";

export function StepNodeView({ data }: NodeProps<StepNode>) {
  const { label, nodeType, status, selected, simulated } = data;
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`flex cursor-pointer flex-col justify-center rounded-lg border px-3 transition-colors ${statusStyle[status]} ${
        selected ? "outline-2 outline-offset-2 outline-accent" : ""
      }`}
    >
      {nodeType !== "trigger" && <Handle type="target" position={Position.Top} isConnectable={false} className={handle} />}
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted uppercase">
        <span>
          {typeLabel[nodeType]}
          {simulated && <span className="ml-1.5 normal-case text-accent">· simulated</span>}
        </span>
        <span aria-hidden="true" className={`text-xs ${glyphColour[status]}`}>
          {statusGlyph[status]}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[13px] font-medium text-fg">{label}</p>
      {nodeType === "condition" ? (
        <>
          <Handle id="true" type="source" position={Position.Bottom} isConnectable={false} style={{ left: "30%" }} className={handle} />
          <Handle id="false" type="source" position={Position.Bottom} isConnectable={false} style={{ left: "70%" }} className={handle} />
        </>
      ) : (
        nodeType !== "output" && <Handle type="source" position={Position.Bottom} isConnectable={false} className={handle} />
      )}
    </div>
  );
}
