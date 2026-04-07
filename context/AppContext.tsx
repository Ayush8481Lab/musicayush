"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type AppContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  
  currentSong: any;
  setCurrentSong: (song: any) => void;
  
  isPlaying: boolean;
  setIsPlaying: (play: boolean) => void;
  
  queue: any[];
  setQueue: (queue: any[]) => void;
  
  upcomingQueue: any[];
  setUpcomingQueue: React.Dispatch<React.SetStateAction<any[]>>;
  
  historyQueue: any[];
  setHistoryQueue: React.Dispatch<React.SetStateAction<any[]>>;
  
  playContext: { type: string; name: string };
  setPlayContext: (context: { type: string; name: string }) => void;

  likedSongs: any[];
  toggleLikeSong: (song: any) => void;
  
  likedPlaylists: any[];
  toggleLikePlaylist: (playlist: any) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const[language, setLanguage] = useState("hindi");
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const[queue, setQueue] = useState<any[]>([]);
  const [upcomingQueue, setUpcomingQueue] = useState<any[]>([]);
  const [historyQueue, setHistoryQueue] = useState<any[]>([]);
  
  const[playContext, setPlayContext] = useState({ type: "Track", name: "Single Track" });

  const[likedSongs, setLikedSongs] = useState<any[]>([]);
  const [likedPlaylists, setLikedPlaylists] = useState<any[]>([]);

  // Safely restore session data only on client side to avoid Next.js deployment errors
  useEffect(() => {
    try {
       const recent = JSON.parse(localStorage.getItem('recent_songs') || '[]');
       if (recent.length > 0) setHistoryQueue(recent);
       
       const storedLikedSongs = JSON.parse(localStorage.getItem('liked_songs') || '[]');
       if (storedLikedSongs.length > 0) setLikedSongs(storedLikedSongs);

       const storedLikedPlaylists = JSON.parse(localStorage.getItem('liked_playlists') || '[]');
       if (storedLikedPlaylists.length > 0) setLikedPlaylists(storedLikedPlaylists);
    } catch(e) {}
  },[]);

  const toggleLikeSong = (song: any) => {
    if (!song) return;
    setLikedSongs(prev => {
      const exists = prev.find(s => s.id === song.id);
      const newList = exists ? prev.filter(s => s.id !== song.id) : [song, ...prev];
      localStorage.setItem('liked_songs', JSON.stringify(newList));
      return newList;
    });
  };

  const toggleLikePlaylist = (playlist: any) => {
    if (!playlist) return;
    setLikedPlaylists(prev => {
      const exists = prev.find(p => p.id === playlist.id || p.title === playlist.title);
      const newList = exists ? prev.filter(p => p.id !== playlist.id && p.title !== playlist.title) : [playlist, ...prev];
      localStorage.setItem('liked_playlists', JSON.stringify(newList));
      return newList;
    });
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, 
      currentSong, setCurrentSong, 
      isPlaying, setIsPlaying, 
      queue, setQueue,
      upcomingQueue, setUpcomingQueue,
      historyQueue, setHistoryQueue,
      playContext, setPlayContext,
      likedSongs, toggleLikeSong,
      likedPlaylists, toggleLikePlaylist
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
