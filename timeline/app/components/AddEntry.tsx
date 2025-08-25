"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTimeline } from "@/app/context/Context";
import { useUser } from "@clerk/nextjs";
import { Plus } from 'lucide-react';

interface AddEntryProps {
  date: Date;
  onSave: (message: string, date: Date, colour: string) => void;
  onCancel: () => void;
  lineColor?: string;
  textColor?: string;
}

const AddEntry: React.FC<AddEntryProps> = ({
                                             date,
                                             onSave,
                                             onCancel,
                                             lineColor = "blue",
                                             textColor = "black",
                                           }) => {
  const { centerTime, getTimeRange } = useTimeline();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const presetColors = [
    "#ef4444", // red-500
    "#3b82f6", // blue-500
    "#22c55e", // green-500
    "#f59e0b", // amber-500
    "#a855f7", // purple-500
    "#ec4899", // pink-500
    "#eab308", // yellow-500
  ];
  const [selectedColor, setSelectedColor] = useState(lineColor);
  const [customColor, setCustomColor] = useState("#000000");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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

  const handleSave = () => {
    if (message.trim()) {
      onSave(message, date, selectedColor);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  // Calculate position on timeline (0-100%)
  const timeRange = getTimeRange();
  const startTime = centerTime - timeRange / 2;
  const position = ((date.getTime() - startTime) / timeRange) * 100;

  if (position < 0 || position > 100) return null; // skip rendering if outside viewport

  const entryDatePretty = formatEntryDate(date);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-0 w-10"
        style={{
          left: `${position}%`,
          height: "100%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
        }}
      >
        <div
          className="w-0.5 h-full mx-auto"
          style={{
            backgroundColor: selectedColor,
          }}
        />
        <div
          className="p-4"
          style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            color: textColor,
            fontWeight: 400,
            background: "white",
            border: `2px solid ${selectedColor}`,
            zIndex: 30,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            minWidth: "400px",
            width: "max-content",
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Date header */}
          <div className="text-lg pb-2 whitespace-nowrap">
            {entryDatePretty}
          </div>

          <div className="mb-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened on this day?"
              className="w-full border-none outline-none text-sm resize-none bg-transparent overflow-hidden"
              style={{
                minHeight: "60px",
                height: "auto",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          </div>

          <div className="flex gap-2 w-full mb-4 justify-between">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded border-2 ${
                  selectedColor === color ? "border-black" : "border-gray-400"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Custom color picker */}
            <div className="relative">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedColor(e.target.value);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className={`flex items-center justify-center w-6 h-6 rounded border-2 ${
                  selectedColor === customColor ? "border-black" : "border-gray-400"
                }`}
                style={{
                  backgroundColor:
                    selectedColor === customColor ? customColor : "white",
                }}
              >
                {selectedColor !== customColor && (
                  <Plus className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="w-full px-3 py-1 bg-gray-300 text-black rounded text-sm hover:bg-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!message.trim()}
              className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEntry;