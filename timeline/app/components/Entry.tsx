"use client";

import React, { useState } from "react";
import { useTimeline } from "@/app/context/Context";

interface EntryProps {
  id: string | number;
  date: string; // ISO string from DB: "2025-08-23T12:00:00Z"
  message: string;
  colour: string;
}

const Entry: React.FC<EntryProps> = ({
                                       id,
                                       date,
                                       message,
                                       colour,
                                     }) => {
  const { centerTime, timeRange } = useTimeline();
  const [selected, setSelected] = useState(false);

  const entryDate = date ? new Date(date.replace(" ", "T")) : new Date();

  function formatEntryDate(date: Date): string {
    // --- time part ---
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12; // convert 0 to 12 for 12-hour format

    // --- day with ordinal suffix ---
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";

    // --- month and year ---
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();

    return `${hours}:${minutes} ${ampm} ${day}${suffix} ${month} ${year}`;
  }

  const entryDatePretty = formatEntryDate(entryDate)

  // Calculate position on timeline (0-100%)
  const startTime = centerTime - timeRange / 2;
  const position = ((entryDate.getTime() - startTime) / timeRange) * 100;
  if (position < 0 || position > 100) return null; // skip rendering if outside viewport

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-0 w-10 group"
        style={{
          left: `${position}%`,
          height: "100%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
        onClick={() => setSelected(!selected)}
      >

        <div
          className="w-0.5 h-full mx-auto group-hover:w-1"
          style={{
            backgroundColor: colour,
            zIndex: 0,
          }}
        />
        {selected && (
          <div
            className="p-4 z-5"
            style={{
              position: "absolute",
              top: "80px",
              left: "50%",
              color: "#000000",
              fontWeight: 400,
              whiteSpace: "nowrap",
              background: "white",
              border: `2px solid ${colour}`,
              zIndex: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
            >
              <div className="text-lg pb-2">
                {entryDatePretty}
              </div>
              <div className="text-sm">
                {message}
              </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Entry;
