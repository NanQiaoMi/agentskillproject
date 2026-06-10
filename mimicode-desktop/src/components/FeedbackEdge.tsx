import React from 'react';
import { EdgeProps, useStore } from '@xyflow/react';

export const FeedbackEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  animated
}) => {
  // Find the right-most X coordinate among all nodes
  const maxNodeX = useStore((s) => {
    let maxX = Math.max(sourceX, targetX);
    s.nodes.forEach(n => {
      // Estimate node right edge: position.x + width (default to 220 since CustomLightNode is 220px wide)
      const nodeRightX = n.position.x + (n.measured?.width || 220);
      if (nodeRightX > maxX) maxX = nodeRightX;
    });
    return maxX;
  });

  // Calculate a padding out to the right
  const farRightX = maxNodeX + 60; // 60px clearance to the right of the right-most node

  // Construct a custom SVG path with rounded corners (15px radius)
  let path = '';
  const r = 15; // corner radius

  if (sourceY >= targetY) {
    // Feedback loop going UP
    path = `M ${sourceX} ${sourceY} 
            L ${farRightX - r} ${sourceY}
            Q ${farRightX} ${sourceY} ${farRightX} ${sourceY - r}
            L ${farRightX} ${targetY + r}
            Q ${farRightX} ${targetY} ${farRightX - r} ${targetY}
            L ${targetX} ${targetY}`;
  } else {
    // Feedback loop going DOWN (rare for feedback, but possible)
    path = `M ${sourceX} ${sourceY} 
            L ${farRightX - r} ${sourceY}
            Q ${farRightX} ${sourceY} ${farRightX} ${sourceY + r}
            L ${farRightX} ${targetY - r}
            Q ${farRightX} ${targetY} ${farRightX - r} ${targetY}
            L ${targetX} ${targetY}`;
  }

  // Handle stroke dasharray for animated edges
  let finalStyle = { ...style, fill: 'none' };
  if (animated) {
    finalStyle = {
      ...finalStyle,
      strokeDasharray: '5, 5',
      animation: 'dashdraw 0.5s linear infinite'
    };
  }

  return (
    <>
      <style>
        {`
          @keyframes dashdraw {
            from { stroke-dashoffset: 10; }
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
      <path
        id={id}
        style={finalStyle}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd as string}
      />
    </>
  );
};
