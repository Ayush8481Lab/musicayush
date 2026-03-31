"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// 1. Update the Types to include the Queue
type AppContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  
  currentSong: any;
  setCurrentSong: (song: any) => void;
  
  isPlaying: boolean;
  setIsPlaying: (play: boolean) => void;
  
  // Added Queue Types for Auto-Play functionality
  queue: any[];
  setQueue: (queue: any[]) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("hindi");
  const[currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 2. Added Queue State
  const [queue, setQueue] = useState<any[]>(
