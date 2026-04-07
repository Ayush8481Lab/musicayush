"use client";
import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";

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
  
  globalSpotifyUrl: string | null;
  setGlobalSpotifyUrl: (url: string | null) => void;
  isFetchingRecsUI: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("hindi");
  const[currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [queue, setQueue] = useState<any[]>([]);
  const[upcomingQueue, setUpcomingQueue] = useState<any[]>([]);
  const [historyQueue, setHistoryQueue] = useState<any[]>([]);
  
  const [globalSpotifyUrl, setGlobalSpotifyUrl] = useState<string | null>(null);
  const [isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);

  const fetchingRecsRef = useRef(false);
  const fetchedRecsFor = useRef<Set<string>>(new Set());

  // Restore history session instantly
  useEffect(() => {
    try {
       const recent = JSON.parse(localStorage.getItem('recent_songs') || '[]');
       if (recent.length > 0) setHistoryQueue(recent);
    } catch(e) {}
  },[]);

  // Global Intelligent Recommendation Engine
  useEffect(() => {
    let isSubscribed = true;
    const fetchRecommendations = async () => {
      if (upcomingQueue.length <= 3 && !fetchingRecsRef.current && currentSong) {
        fetchingRecsRef.current = true;
        setIsFetchingRecsUI(true);
        
        try {
          const targetSong = historyQueue.length > 0 ? historyQueue[0] : currentSong;
          const targetSpotifyUrl = targetSong.spotifyUrl || globalSpotifyUrl;
          
          let apiSongs: any[] =[];
          if (targetSpotifyUrl && !fetchedRecsFor.current.has(targetSpotifyUrl)) {
            fetchedRecsFor.current.add(targetSpotifyUrl);
            const targetUrl = `https://ayushdetaser.vercel.app/api?link=${encodeURIComponent(targetSpotifyUrl)}`;
            try {
              const res = await fetch(targetUrl);
              const parsedData = await res.json();
              if (parsedData?.status === 'success' && parsedData.recommendations?.length > 0) {
                apiSongs = parsedData.recommendations.map((rec: any) => {
                  const saavnIdMatch = rec?.jiosaavn_link?.match(/\/([^\/]+)$/);
                  const saavnId = saavnIdMatch ? saavnIdMatch[1] : Math.random().toString();
                  return {
                    id: saavnId, title: rec.title, name: rec.title, artists: rec.artist,
                    image: rec.banner_link, url: rec.jiosaavn_link, downloadUrl: [{ url: rec.stream_url }],
                    isRecommendation: true, spotifyUrl: rec.spotify_link
                  };
                }).slice(0, 6); 
              }
            } catch (err) {}
          }

          let top30: any[] =[];
          try { top30 = JSON.parse(localStorage.getItem('top_30_songs') || '[]'); } catch (e) {}
          const shuffledTop30 = top30.sort(() => 0.5 - Math.random()).slice(0, 4);

          const mixed =[...apiSongs, ...shuffledTop30];

          if (isSubscribed && mixed.length > 0) {
            setUpcomingQueue(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              existingIds.add(currentSong.id);
              historyQueue.forEach(h => existingIds.add(h.id));
              
              const newSongs = mixed.filter(m => !existingIds.has(m.id));
              const updated = [...prev, ...newSongs];
              return updated.slice(0, 10); 
            });
          }
        } catch (error) {}
        
        fetchingRecsRef.current = false;
        if (isSubscribed) setIsFetchingRecsUI(false);
      }
    };
    fetchRecommendations();
    return () => { isSubscribed = false; };
  },[upcomingQueue.length, currentSong, historyQueue, globalSpotifyUrl]);

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, 
      currentSong, setCurrentSong, 
      isPlaying, setIsPlaying, 
      queue, setQueue,
      upcomingQueue, setUpcomingQueue,
      historyQueue, setHistoryQueue,
      globalSpotifyUrl, setGlobalSpotifyUrl,
      isFetchingRecsUI
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
