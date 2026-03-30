"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  currentSong: any;
  setCurrentSong: (song: any) => void;
  isPlaying: boolean;
  setIsPlaying: (play: boolean) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("hindi");
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <AppContext.Provider value={{ language, setLanguage, currentSong, setCurrentSong, isPlaying, setIsPlaying }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
