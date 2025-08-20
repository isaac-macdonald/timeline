"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type BirthdayContextType = {
  birthday: Date | null;
  setBirthday: (date: Date) => void;
};

const BirthdayContext = createContext<BirthdayContextType | undefined>(undefined);

export const BirthdayProvider = ({ children }: { children: ReactNode }) => {
  const [birthday, setBirthday] = useState<Date | null>(null);

  return (
    <BirthdayContext.Provider value={{ birthday, setBirthday }}>
      {children}
    </BirthdayContext.Provider>
  );
};

export const useBirthday = () => {
  const context = useContext(BirthdayContext);
  if (!context) throw new Error("useBirthday must be used inside BirthdayProvider");
  return context;
};
