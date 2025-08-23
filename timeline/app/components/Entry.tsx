"use client";

import React, { useState } from "react";
import { useTimeline } from "@/app/context/Context";

interface EntryProps {
  id: string | number;
  date: string; // ISO string from DB: "2025-08-23T12:00:00Z"
  message: string;
  lineColor?: string;
  textColor?: string;
}

const Entry: React.FC<EntryProps> = ({
                                       id,
                                       date,
                                       message,
                                       lineColor = "red",
                                       textColor = "black",
                                     }) => {
  const { centerTime, timeRange } = useTimeline();
  const [selected, setSelected] = useState(false);

  const entryDate = date ? new Date(date.replace(" ", "T")) : new Date();

  // Calculate position on timeline (0-100%)
  const startTime = centerTime - timeRange / 2;
  const position = ((entryDate.getTime() - startTime) / timeRange) * 100;
  if (position < 0 || position > 100) return null; // skip rendering if outside viewport

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-0"
        style={{
          left: `${position}%`,
          width: "3px",
          height: "100%",
          backgroundColor: lineColor,
          transform: "translateX(-50%)",
          pointerEvents: "auto",
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
              fontSize: "1rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: "white",
              border: `1px solid ${lineColor}`,
              borderRadius: "6px",
              padding: "4px 8px",
              zIndex: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Entry;
