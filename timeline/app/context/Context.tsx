// app/context/context.tsx
"use client";
import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

/* ====================== Timeline ====================== */
export const MIN_ZOOM_DURATION = 60 * 1000; // 1 minute
export const MAX_ZOOM_DURATION = 3000 * 365.25 * 24 * 60 * 60 * 1000; // ~3000 years

type TimelineContextType = {
  /** center of the visible window in ms (epoch) */
  centerTime: number;
  setCenterTime: (ms: number) => void;

  /** zoom in [0..1] where 1 is closest */
  zoom: number;
  setZoom: (z: number) => void;

  /** derived range (ms), and convenience start/end boundaries */
  timeRange: number;
  startTime: number;
  endTime: number;

  /** helper to compute current timeRange */
  getTimeRange: () => number;
};

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

export const TimelineProvider = ({ children }: { children: ReactNode }) => {
  const [centerTime, setCenterTime] = useState<number>(Date.now());
  const [zoom, setZoom] = useState<number>(0.5);

  const timeRange = useMemo(
    () => MIN_ZOOM_DURATION * Math.pow(MAX_ZOOM_DURATION / MIN_ZOOM_DURATION, 1 - zoom),
    [zoom]
  );
  const startTime = useMemo(() => centerTime - timeRange / 2, [centerTime, timeRange]);
  const endTime = useMemo(() => centerTime + timeRange / 2, [centerTime, timeRange]);

  const value = useMemo<TimelineContextType>(
    () => ({
      centerTime,
      setCenterTime,
      zoom,
      setZoom,
      timeRange,
      startTime,
      endTime,
      getTimeRange: () => timeRange,
    }),
    [centerTime, zoom, timeRange, startTime, endTime]
  );

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
};

export const useTimeline = () => {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error("useTimeline must be used inside TimelineProvider");
  return ctx;
};

/* ====================== One wrapper to use in layout ====================== */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <TimelineProvider>
    {children}
  </TimelineProvider>
);
