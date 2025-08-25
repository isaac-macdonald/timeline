'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTimeline } from '@/app/context/Context'; // ✅ import global state
import { motion } from 'framer-motion';
import HoverLine from '@/app/components/Entry';
import { useAuth, useUser } from '@clerk/nextjs';
import Entry from '@/app/components/Entry';
import AddEntry from '@/app/components/AddEntry';

interface Tick {
  time: number;
  position: number;
  label: string;
  height: number;
}

interface Marker {
  date: Date;
  color: string;
}

interface DiaryEntry {
  id: string | number;
  entry_datetime: string; // ISO string like "2025-08-26T16:37:11.633Z"
  message: string;
  colour: string;
  // add other fields if your DB returns them
}

const TIME_UNITS = [
  { name: 'millennia', ms: 1000 * 60 * 60 * 24 * 365.25 * 1000 },
  { name: 'centuries', ms: 1000 * 60 * 60 * 24 * 365.25 * 100 },
  { name: 'decades', ms: 1000 * 60 * 60 * 24 * 365.25 * 10 },
  { name: 'years', ms: 1000 * 60 * 60 * 24 * 365.25 },
  { name: 'months', ms: 1000 * 60 * 60 * 24 * 30.44 },
  { name: 'days', ms: 1000 * 60 * 60 * 24 },
  { name: 'hours', ms: 1000 * 60 * 60 },
  { name: 'minutes', ms: 1000 * 60 }
];

const MIN_ZOOM_DURATION = 60 * 1000;
const MAX_ZOOM_DURATION = 3000 * 365.25 * 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

const ZoomableTimeline = () => {
  const {
    zoom,
    setZoom,
    centerTime,
    setCenterTime,
    getTimeRange
  } = useTimeline(); // ✅ now reading/writing from context

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState<Date | null>(null);

  const { user } = useUser();


  const [currentTime, setCurrentTime] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const containerWidth = rect.width;

    const timeRange = getTimeRange();
    const startTime = centerTime - timeRange / 2;
    const clickedTime = startTime + (clickX / containerWidth) * timeRange;

    setShowAddEntry(new Date(clickedTime));
  };

  useEffect(() => {
    if (!user) return; // wait until user is loaded
    async function loadEntries() {
      const res = await fetch(`/api/diary_entries?userId=${user?.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    }
    loadEntries();
  }, [user]);

  const handleAddEntry = async (message: string, date: Date, colour: string) => {
    try {
      const res = await fetch("/api/diary_entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          date: date.toLocaleString("sv-SE"),
          userId: user?.id,
          colour: colour,
        }),
      });

      if (!res.ok) {
        console.error("Failed to save entry");
        return;
      }

      const saved = await res.json();
      setEntries(prev => [...prev, saved]);
      setShowAddEntry(null);
    } catch (err) {
      console.error("Error saving entry:", err);
    }
  };

  useEffect(() => {
    let animationFrameId: number;

    const updateTime = () => {
      setCurrentTime(Date.now());
      animationFrameId = requestAnimationFrame(updateTime);
    };

    animationFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const formatTime = useCallback((timestamp: number, unit: string) => {
    const date = new Date(timestamp);
    switch (unit) {
      case 'millennia':
      case 'centuries':
      case 'decades':
      case 'years':
        return date.getFullYear().toString();
      case 'months':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'days':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'hours':
      case 'minutes':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      default:
        return date.toLocaleString();
    }
  }, []);

  function floorToUnit(startMs: number, unit: string): number {
    const d = new Date(startMs);
    switch (unit) {
      case 'millennia': {
        const y = Math.floor(d.getFullYear() / 1000) * 1000;
        d.setFullYear(y, 0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case 'centuries': {
        const y = Math.floor(d.getFullYear() / 100) * 100;
        d.setFullYear(y, 0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case 'decades': {
        const y = Math.floor(d.getFullYear() / 10) * 10;
        d.setFullYear(y, 0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case 'years':
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      case 'months':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      case 'days':
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      case 'hours':
        d.setMinutes(0, 0, 0);
        return d.getTime();
      case 'minutes':
        d.setSeconds(0, 0);
        return d.getTime();
      default:
        return startMs;
    }
  }

  function addOne(ms: number, unit: string): number {
    const d = new Date(ms);
    switch (unit) {
      case 'millennia': d.setFullYear(d.getFullYear() + 1000); return d.getTime();
      case 'centuries': d.setFullYear(d.getFullYear() + 100); return d.getTime();
      case 'decades':   d.setFullYear(d.getFullYear() + 10);  return d.getTime();
      case 'years':     d.setFullYear(d.getFullYear() + 1);   return d.getTime();
      case 'months':    d.setMonth(d.getMonth() + 1);         return d.getTime();
      case 'days':      d.setDate(d.getDate() + 1);           return d.getTime();
      case 'hours':     d.setHours(d.getHours() + 1);         return d.getTime();
      case 'minutes':   d.setMinutes(d.getMinutes() + 1);     return d.getTime();
      default:          return ms;
    }
  }

  const generateTicks = useCallback((): Tick[] => {
    const ticks: Tick[] = [];
    const timeRange = getTimeRange();
    const startTime = centerTime - timeRange / 2;
    const endTime = centerTime + timeRange / 2;
    const containerWidth =
      timelineRef.current?.clientWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 1000);

    const minLabelSpacingPx = 60;

    let labelUnit: typeof TIME_UNITS[0] | null = null;
    for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
      const unit = TIME_UNITS[i];
      const first = floorToUnit(startTime, unit.name);
      const next = addOne(first, unit.name);
      const deltaMs = Math.max(1, next - first);
      const spacingPx = (deltaMs / timeRange) * containerWidth;
      if (spacingPx >= minLabelSpacingPx) {
        labelUnit = unit;
        break;
      }
    }

    for (const unit of TIME_UNITS) {
      const first = floorToUnit(startTime, unit.name);
      const next = addOne(first, unit.name);
      const deltaMs = Math.max(1, next - first);

      const estimatedCount = Math.ceil(timeRange / deltaMs) + 2;
      if (estimatedCount <= 0 || estimatedCount > 1000) continue;

      const height = Math.max(1, Math.min(50, 50 * (deltaMs / timeRange)));

      for (let t = first; t <= endTime; t = addOne(t, unit.name)) {
        const position = ((t - startTime) / timeRange) * 100;
        if (position < -5 || position > 105) continue;

        ticks.push({
          time: t,
          position,
          height,
          label: labelUnit?.name === unit.name ? formatTime(t, unit.name) : ''
        });
      }
    }

    return ticks;
  }, [centerTime, formatTime, getTimeRange]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!timelineRef.current) return;

    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const timeRange = getTimeRange();
      const timeDelta = (e.deltaX / window.innerWidth) * timeRange;
      const newCenter = centerTime + timeDelta;
      setCenterTime(newCenter);
    } else {
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const containerWidth = rect.width;
      const mouseRatio = mouseX / containerWidth;

      const oldTimeRange = getTimeRange();
      const oldStartTime = centerTime - oldTimeRange / 2;
      const mouseTime = oldStartTime + mouseRatio * oldTimeRange;

      const zoomSpeed = 0.002;
      const deltaZoom = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;

      const newZoom = Math.max(0, Math.min(1, zoom + deltaZoom));
      const newTimeRange = MIN_ZOOM_DURATION * Math.pow(MAX_ZOOM_DURATION / MIN_ZOOM_DURATION, 1 - newZoom);
      const newStartTime = mouseTime - mouseRatio * newTimeRange;
      const newCenter = newStartTime + newTimeRange / 2;

      setZoom(newZoom);
      setCenterTime(newCenter);

    }
  }, [centerTime, getTimeRange, setCenterTime, setZoom]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      timeline.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const ticks = generateTicks();
  const timeRange = getTimeRange();
  const startTime = centerTime - timeRange / 2;
  const currentTimePosition = ((Date.now() - startTime) / timeRange) * 100;

  return (
    <div className="w-full h-screen bg-white text-black overflow-hidden">
      <div ref={timelineRef} onContextMenu={handleRightClick} className="relative w-full h-full cursor-default">

        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-black"></div>

        {ticks.map((tick, idx) => (
          <div
            key={idx}
            className="absolute top-1/2"
            style={{ left: `${tick.position}%` }}
          >
            <div
              className="bg-black w-0.5"
              style={{ height: `${tick.height}px`, transform: 'translateY(-50%)' }}
            ></div>
            <div className="absolute top-6 -translate-x-1/2 text-xs whitespace-nowrap">
              {tick.label}
            </div>
          </div>
        ))}

        {currentTimePosition !== null &&
          currentTimePosition >= 0 &&
          currentTimePosition <= 100 && (
            <div
              className="absolute top-1/2 w-0.5 bg-gray-500"
              style={{
                left: `${currentTimePosition}%`,
                height: "100%",
                transform: "translateY(-50%)",
                zIndex: 0
              }}
            />
          )}

        {currentTimePosition > 0 && (
          <>
            <div
              className="absolute top-0 h-full bg-gray-200 opacity-40 z-0"
              style={{
                left: 0,
                width: `${currentTimePosition}%`,
              }}
            />
            <div
              className="absolute top-2 text-gray-400 z-0"
              style={{
                left: `${currentTimePosition}%`,
                transform: 'translateX(-102%)',
                marginRight: '4px',
                fontWeight: 400,
                fontSize: '18px',
                fontFamily: 'Arial, sans-serif',
                whiteSpace: 'nowrap',

              }}
            >
              THE UNSTOPPABLE MARCH OF TIME
            </div>
          </>
        )}

        <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
          <div>Scroll up/down: Zoom</div>
          <div>Scroll left/right: Pan timeline</div>
        </div>

        {entries.map(entry => (
          <Entry
            key={entry.id}
            id={entry.id}
            date={entry.entry_datetime}
            message={entry.message}
            colour={entry.colour}
          />
        ))}

        {showAddEntry && (
          <AddEntry
            date={showAddEntry}
            onSave={handleAddEntry}
            onCancel={() => setShowAddEntry(null)}
            lineColor="blue"
            textColor="black"
          />
        )}

      </div>
    </div>
  );
};

export default ZoomableTimeline;
