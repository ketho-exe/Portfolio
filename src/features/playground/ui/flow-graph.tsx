"use client";

import { Background, BackgroundVariant, Controls, ReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useSyncExternalStore } from "react";
import type { WorkflowInput } from "../engine";
import { layoutWorkflow } from "./layout";
import type { ReplayFrame } from "./replay";
import { StepNodeView, type StepNode } from "./step-node";

const nodeTypes = { step: StepNodeView };

// On touch screens, dragging the canvas would trap page scrolling. The whole graph is fitted to view, so panning isn't needed there.
const coarseQuery = "(pointer: coarse)";
function useCoarsePointer() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(coarseQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(coarseQuery).matches,
    () => false,
  );
}

type Props = {
  definition: WorkflowInput;
  frame: ReplayFrame;
  selectedId: string | null;
  badges: Record<string, string>;
  onSelect: (id: string) => void;
};

/** Read-only workflow canvas. Selection and status come from the parent; nothing is draggable or editable. */
export default function FlowGraph({ definition, frame, selectedId, badges, onSelect }: Props) {
  const positions = useMemo(() => layoutWorkflow(definition), [definition]);
  const touch = useCoarsePointer();

  const nodes: StepNode[] = definition.nodes.map((n) => ({
    id: n.id,
    type: "step",
    position: positions[n.id],
    data: {
      label: n.label,
      nodeType: n.type,
      status: frame.statuses[n.id],
      selected: n.id === selectedId,
      badge: badges[n.id],
    },
  }));

  const edges: Edge[] = definition.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    type: "smoothstep",
    label: e.sourceHandle === "true" ? "yes" : e.sourceHandle === "false" ? "no" : undefined,
    labelStyle: { fontSize: 10, fontFamily: "var(--font-mono)" },
    className: frame.edges[e.id],
    animated: frame.edges[e.id] === "taken" && frame.statuses[e.target] === "running",
  }));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ padding: 24 }}
      minZoom={0.3}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag={!touch}
      zoomOnPinch={!touch}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border)" />
      {!touch && <Controls showInteractive={false} />}
    </ReactFlow>
  );
}
