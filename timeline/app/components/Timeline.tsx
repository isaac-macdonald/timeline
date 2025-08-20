'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBirthday } from '@/app/context/BirthdayContext';

interface Tick {
  time: number;
  position: number;
  label: string;
  height: number;
  width: number;
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

  // Generate hierarchical ticks
  const generateTicks = useCallback((): Tick[] => {
    const ticks: Tick[] = [];
    const timeRange = getTimeRange();
    const startTime = centerTime - timeRange / 2;
    const endTime = centerTime + timeRange / 2;
    const containerWidth = timelineRef.current?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1000);

    // Minimum pixels between labels
    const minLabelSpacingPx = 60;

    // Determine which unit to show labels for
    let labelUnit: typeof TIME_UNITS[0] | null = null;
    for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
      const unit = TIME_UNITS[i];
      const spacingPx = (unit.ms / timeRange) * containerWidth;
      if (spacingPx >= minLabelSpacingPx) {
        labelUnit = unit;
        break;
      }
    }

    for (const unit of TIME_UNITS) {
      const numTicks = Math.ceil(timeRange / unit.ms);
      if (numTicks <= 0 || numTicks > 500) continue;

      const height = Math.max(3, Math.min(75, 75 * (unit.ms / timeRange)));
      const width = Math.max(1, Math.min(3, 3 * (unit.ms / timeRange)));
      const firstTick = Math.floor(startTime / unit.ms) * unit.ms;

      for (let t = firstTick; t <= endTime; t += unit.ms) {
        const position = ((t - startTime) / timeRange) * 100;
        if (position < -5 || position > 105) continue;

        ticks.push({
          time: t,
          position,
          height,
          width,
          label: labelUnit === unit ? formatTime(t, unit.name) : ''
        });
      }
    }

    return ticks;
  }, [centerTime, formatTime, getTimeRange]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const containerWidth = rect.width;
    const mouseRatio = mouseX / containerWidth;

    const oldTimeRange = getTimeRange();
    const oldStartTime = centerTime - oldTimeRange / 2;
    const mouseTime = oldStartTime + mouseRatio * oldTimeRange;

    // Zoom update
    const zoomSpeed = 0.002;
    const deltaZoom = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    setZoom(prev => {
      const newZoom = Math.max(0, Math.min(1, prev + deltaZoom));

      // After zooming, recalc center so mouseTime stays fixed
      const newTimeRange = MIN_ZOOM_DURATION * Math.pow(MAX_ZOOM_DURATION / MIN_ZOOM_DURATION, 1 - newZoom);
      const newStartTime = mouseTime - mouseRatio * newTimeRange;
      const newCenter = newStartTime + newTimeRange / 2;

      setCenterTime(newCenter);
      return newZoom;
    });
  }, [centerTime, getTimeRange]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const timeRange = getTimeRange();
    const timeDelta = -(deltaX / window.innerWidth) * timeRange;
    setCenterTime(prev => prev + timeDelta);
    setLastMouseX(e.clientX);
  }, [isDragging, lastMouseX, getTimeRange]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      timeline.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

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

  return (
    <div className="w-full h-screen bg-white text-black overflow-hidden">


      <div
        ref={timelineRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-black"></div>

        {ticks.map((tick, idx) => (
          <div
            key={idx}
            className="absolute top-1/2"
            style={{ left: `${tick.position}%` }}
          >
            <div
              className="bg-black w-0.5"
              style={{ height: `${tick.height}px`, width: `${tick.width}px`,transform: 'translateY(-50%)' }}
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

        {expectedDeathPosition !== null &&
          expectedDeathPosition >= 0 &&
          expectedDeathPosition <= 100 && (
            <div
              className="absolute top-1/2 w-0.5 bg-blue-500 z-10"
              style={{
                left: `${expectedDeathPosition}%`,
                height: "100%",
                transform: "translateY(-50%)",
              }}
            >
              <div className="absolute -top-8 -translate-x-1/2 text-blue-400 text-xs font-bold whitespace-nowrap">
                BIRTHDAY
              </div>
            </div>
          )}

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
          <div>Mouse wheel: Zoom in/out</div>
          <div>Click & drag: Pan timeline</div>
        </div>
      </div>
    </div>
  );
};

export default ZoomableTimeline;
