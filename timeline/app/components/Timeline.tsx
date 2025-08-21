'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBirthday } from '@/app/context/BirthdayContext';
import { motion } from 'framer-motion';

interface Tick {
  time: number;
  position: number;
  label: string;
  height: number;
}

const TIME_UNITS = [
  { name: 'millennia', ms: 1000 * 60 * 60 * 24 * 365.25 * 1000 }, // 1000 years
  { name: 'centuries', ms: 1000 * 60 * 60 * 24 * 365.25 * 100 },
  { name: 'decades', ms: 1000 * 60 * 60 * 24 * 365.25 * 10 },
  { name: 'years', ms: 1000 * 60 * 60 * 24 * 365.25 },
  { name: 'months', ms: 1000 * 60 * 60 * 24 * 30.44 },
  { name: 'days', ms: 1000 * 60 * 60 * 24 },
  { name: 'hours', ms: 1000 * 60 * 60 },
  { name: 'minutes', ms: 1000 * 60 }
];

const ZoomableTimeline = () => {
  const { birthday } = useBirthday();
  const [zoom, setZoom] = useState(0.5); // 0 = far out, 1 = fully zoomed in
  const [centerTime, setCenterTime] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const timelineRef = useRef<HTMLDivElement>(null);

  const MIN_ZOOM_DURATION = 60 * 1000; // 1 minute
  const MAX_ZOOM_DURATION = 3000 * 365.25 * 24 * 60 * 60 * 1000; // year 3000
  const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;


  useEffect(() => {
    let animationFrameId: number;

    const updateTime = () => {
      setCurrentTime(Date.now()); // or performance.now() for higher precision
      animationFrameId = requestAnimationFrame(updateTime);
    };

    animationFrameId = requestAnimationFrame(updateTime);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Calculate visible time range based on zoom
  const getTimeRange = useCallback(() => {
    const min = MIN_ZOOM_DURATION;       // 1 minute
    const max = MAX_ZOOM_DURATION;       // 3000 years
    const range = max / min;             // ratio
    return min * Math.pow(range, 1 - zoom); // zoom = 1 → min, zoom = 0 → max
  }, [zoom]);

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
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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


  // Generate hierarchical ticks
  const generateTicks = useCallback((): Tick[] => {
    const ticks: Tick[] = [];
    const timeRange = getTimeRange();
    const startTime = centerTime - timeRange / 2;
    const endTime = centerTime + timeRange / 2;
    const containerWidth =
      timelineRef.current?.clientWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 1000);

    // Minimum pixels between labels
    const minLabelSpacingPx = 60;

    // Choose which unit gets labels: pick the smallest unit whose *actual* tick spacing
    // on screen is at least minLabelSpacingPx.
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

    // Build ticks per unit using calendar-aware stepping
    for (const unit of TIME_UNITS) {
      // Estimate how many ticks (using actual delta for this unit near startTime)
      const first = floorToUnit(startTime, unit.name);
      const next = addOne(first, unit.name);
      const deltaMs = Math.max(1, next - first);

      const estimatedCount = Math.ceil(timeRange / deltaMs) + 2;
      if (estimatedCount <= 0 || estimatedCount > 1000) continue;

      // Height scales smoothly with actual delta vs range
      const height = Math.max(1, Math.min(50, 50 * (deltaMs / timeRange)));

      // Walk by calendar unit boundaries
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
      // Horizontal scroll → pan timeline
      const timeRange = getTimeRange();
      const timeDelta = (e.deltaX / window.innerWidth) * timeRange;
      setCenterTime(prev => prev + timeDelta);
    } else {
      // Vertical scroll → zoom
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const containerWidth = rect.width;
      const mouseRatio = mouseX / containerWidth;

      const oldTimeRange = getTimeRange();
      const oldStartTime = centerTime - oldTimeRange / 2;
      const mouseTime = oldStartTime + mouseRatio * oldTimeRange;

      const zoomSpeed = 0.002;
      const deltaZoom = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;

      setZoom(prev => {
        const newZoom = Math.max(0, Math.min(1, prev + deltaZoom));
        const newTimeRange = MIN_ZOOM_DURATION *
          Math.pow(MAX_ZOOM_DURATION / MIN_ZOOM_DURATION, 1 - newZoom);
        const newStartTime = mouseTime - mouseRatio * newTimeRange;
        const newCenter = newStartTime + newTimeRange / 2;

        setCenterTime(newCenter);
        return newZoom;
      });
    }
  }, [centerTime, getTimeRange]);

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
  const currentTimePosition = ((currentTime - startTime) / timeRange) * 100;

  const birthdayPosition =
    birthday != null ? ((birthday.getTime() - startTime) / timeRange) * 100 : null;

  const expectedDeathPosition =
    birthday != null
      ? ((birthday.getTime() + 73 * MS_PER_YEAR - startTime) / timeRange) * 100
      : null;

  function formatDatePretty(date: Date) {
    const day = date.getDate();

    // Add suffix (st, nd, rd, th)
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";

    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();

    return `${day}${suffix} ${month} ${year}`;
  }



  return (
    <div className="w-full h-screen bg-white text-black overflow-hidden">


      <div
        ref={timelineRef}
        className="relative w-full h-full cursor-default"
      >
        <motion.div
          className="absolute top-8 left-16 bg-white/80 backdrop-blur-md shadow-md rounded-lg px-3 py-1 text-xs text-gray-700 z-50"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="font-semibold">Time range:</span>{" "}
          {formatDatePretty(new Date(startTime))} –{" "}
          {formatDatePretty(new Date(centerTime + getTimeRange() / 2))}
        </motion.div>

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


        {birthdayPosition !== null &&
          birthdayPosition >= 0 &&
          birthdayPosition <= 100 && (
            <div
              className="absolute top-1/2 w-0.5 bg-blue-500 z-10"
              style={{
                left: `${birthdayPosition}%`,
                height: "100%",
                transform: "translateY(-50%)",
              }}
            >
              <div className="absolute -top-8 -translate-x-1/2 text-blue-400 text-xs font-bold whitespace-nowrap">
                BIRTHDAY
              </div>
            </div>
          )}

        {/*{expectedDeathPosition !== null &&*/}
        {/*  expectedDeathPosition >= 0 &&*/}
        {/*  expectedDeathPosition <= 100 && (*/}
        {/*    <div*/}
        {/*      className="absolute top-1/2 w-0.5 bg-blue-500 z-10"*/}
        {/*      style={{*/}
        {/*        left: `${expectedDeathPosition}%`,*/}
        {/*        height: "100%",*/}
        {/*        transform: "translateY(-50%)",*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      <div className="absolute -top-8 -translate-x-1/2 text-blue-400 text-xs font-bold whitespace-nowrap">*/}
        {/*        BIRTHDAY*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  )}*/}

        {birthdayPosition !== null &&
          currentTimePosition >= 0 &&
          currentTimePosition <= 100 &&
          birthdayPosition >= 0 &&
          birthdayPosition <= 100 && (
            <div
              className="absolute top-0 h-full bg-red-200 opacity-40 z-10"
              style={{
                left: `${Math.min(currentTimePosition, birthdayPosition)}%`,
                width: `${Math.abs(currentTimePosition - birthdayPosition)}%`,
              }}
            />
          )}

        {currentTimePosition !== null &&
          currentTimePosition >= 0 &&
          currentTimePosition <= 100 && (
            <div
              className="absolute top-1/2 w-0.5 bg-gray-500 z-10"
              style={{
                left: `${currentTimePosition}%`,
                height: "100%",
                transform: "translateY(-50%)",
              }}
            >
            </div>
          )}
        {/* Past shading */}
        {currentTimePosition > 0 && (
          <>
            {/* Past shading */}
            <div
              className="absolute top-0 h-full bg-gray-200 opacity-40 z-0"
              style={{
                left: 0,
                width: `${currentTimePosition}%`,
              }}
            />

            {/* Labels at the divide */}
            <div
              className="absolute top-2 text-gray-400 z-10"
              style={{
                left: `${currentTimePosition}%`,
                transform: 'translateX(-102%)',
                marginRight: '4px',
                fontWeight: 400,           // boldness
                fontSize: '18px',          // font size
                fontFamily: 'Arial, sans-serif', // font family
                whiteSpace: 'nowrap',
              }}
            >
              THE UNSTOPPABLE MARCH OF TIME
            </div>

            <div
              className="absolute top-2 text-gray-400 z-10"
              style={{
                left: `${currentTimePosition}%`,
                transform: 'translateX(0%)',
                marginLeft: '4px',
                fontWeight: 400,
                fontSize: '18px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
            </div>
          </>
        )}


        <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
          <div>Scroll up/down: Zoom</div>
          <div>Scroll left/right: Pan timeline</div>
        </div>


      </div>
    </div>
  );
};

export default ZoomableTimeline;
