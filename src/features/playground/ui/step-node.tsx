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
  /** "simulated", "on device" or "you": how a step actually runs. */
  badge?: string;
};
export type StepNode = Node<StepNodeData, "step">;

export const typeLabel: Record<NodeType, string> = {
  trigger: "Trigger",
  validate: "Validate",
  condition: "Condition",
  transform: "Transform",
  classify: "Classify",
  integration: "Integration",
  review: "Review",
  output: "Output",
};

export const statusGlyph: Record<UiStatus, string> = {
  idle: "○",
  running: "●",
  success: "✓",
  error: "✕",
  skipped: "–",
  waiting: "‖",
};

const statusStyle: Record<UiStatus, string> = {
  idle: "border-white/25 bg-[rgb(20_20_24/0.9)]",
  running: "border-accent bg-accent-soft shadow-[0_0_0_6px_rgb(255_210_63/0.25)]",
  success: "border-ok bg-[rgb(18_38_25)]",
  error: "border-danger bg-[rgb(48_22_24)]",
  skipped: "border-dashed border-white/25 bg-[rgb(20_20_24/0.6)] opacity-55",
  waiting: "border-accent border-dashed bg-accent-soft",
};

const glyphColour: Record<UiStatus, string> = {
  idle: "text-muted",
  running: "text-accent animate-pulse",
  success: "text-ok",
  error: "text-danger",
  skipped: "text-muted",
  waiting: "text-accent",
};

const handle = "!size-1.5 !min-w-0 !min-h-0 !border-0 !bg-muted";

export function StepNodeView({ data }: NodeProps<StepNode>) {
  const { label, nodeType, status, selected, badge } = data;
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`flex cursor-pointer flex-col justify-center rounded-[14px] border-[1.5px] px-3 transition-colors ${statusStyle[status]} ${
        selected ? "outline-2 outline-offset-2 outline-accent" : ""
      }`}
    >
      {nodeType !== "trigger" && <Handle type="target" position={Position.Top} isConnectable={false} className={handle} />}
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted uppercase">
        <span>
          {typeLabel[nodeType]}
          {badge && <span className="ml-1.5 normal-case text-accent">· {badge}</span>}
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
