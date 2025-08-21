"use client";

import React, { useState } from "react";
import { useTimeline } from "@/app/context/Context";

interface StaticLineProps {
  referenceDateString: string; // "DD-MM-YYYY"
  lineColor?: string;
  textColor?: string;
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365.25);

  const months = Math.floor((days % 365.25) / 30.44);
  const d = Math.floor(days % 30.44);
  const h = hours % 24;
  const m = minutes % 60;
  const s = seconds % 60;

  return `${years}y ${months}m ${d}d ${h}h ${m}m ${s}s`;
}

const StaticLine: React.FC<StaticLineProps> = ({
                                                 referenceDateString,
                                                 lineColor = "red",
                                                 textColor = "black",
                                               }) => {
  const { centerTime, timeRange } = useTimeline();
  const [selected, setSelected] = useState(true);

  const [day, month, year] = referenceDateString.split("-").map(Number);
  const referenceDate = new Date(year, month - 1, day);

  // Calculate position on timeline (0-100%)
  const startTime = centerTime - timeRange / 2;
  const position = ((referenceDate.getTime() - startTime) / timeRange) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {position >= 0 && position <= 100 && (
        <div
          className="absolute top-0"
          style={{
            left: `${position}%`,
            width: "3px",
            height: "100%",
            backgroundColor: lineColor,
            transform: "translateX(-50%)",
            pointerEvents: "auto", // allow click events
            cursor: "pointer",
          }}
          onClick={() => setSelected(!selected)}
        >
          {selected && (
            <div
              style={{
                position: "absolute",
                top: "40px",
                left: "50%",
                transform: "translateX(5%)",
                color: textColor,
                fontSize: "1.25rem",
                fontWeight: 700,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                background: "transparent",
                border: "none",
                zIndex: 20,
                textShadow: "0 0 1px rgba(0,0,0,0.3)",
              }}
            >
              {formatDuration(Math.abs(referenceDate.getTime() - Date.now()))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaticLine;
