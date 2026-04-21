"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  User, X, Mic, Play, LayoutGrid, AudioWaveform
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// ==========================================
// 1. AUTH & CACHE ENGINE
// ==========================================
const AUTH_STORAGE_KEY = 'spotify_app_auth';
let ongoingAuthPromise: Promise<any> | null = null;

export const getCachedAuth = () => {
  try {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      const authData = JSON.parse(cached);
      if (Date.now() < (authData.accessTokenExpirationTimestampMs - 10000)) return authData;
    }
  } catch (e) {}
  return null;
};

export const fetchNewAuthToken = async () => {
  if (ongoingAuthPromise) return ongoingAuthPromise;
  ongoingAuthPromise = (async () => {
    try {
      const response = await fetch('https://serverayush.vercel.app/api/auth');
      const data = await response.json();
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) { return null; } finally { ongoingAuthPromise = null; }
  })();
  return ongoingAuthPromise;
};

export const getAuthData = async () => {
  const cachedAuth = getCachedAuth();
  if (cachedAuth) return cachedAuth;
  return await fetchNewAuthToken();
};

// ==========================================
// 2. UTILITIES
// ==========================================
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

const decodeEntities = (text: any) => String(text || "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const getSubtitle = (item: any, type: string) => {
  if (type === "pro" || type === "personalized") return item.artist || item.artists || "Personalised Track";
  if (type === "songs" || item.type === "song") {
    if (item.artists?.primary && Array.isArray(item.artists.primary)) return item.artists.primary.map((a: any) => a.name).join(", ");
    if (typeof item.artists === "string") return item.artists;
    if (item.more_info?.artistMap?.primary_artists?.length > 0) return item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    return item.primaryArtists || item.singers || "Song";
  }
  if (type === "albums" || item.type === "album") return item.artist || (item.year ? `Album • ${item.year}` : "Album");
  if (type === "playlists" || item.type === "playlist") return item.language ? `${item.language} Playlist` : "Playlist";
  if (type === "artists" || item.type === "artist") return "Artist";
  return item.subtitle || item.description || "";
};

const getMatchScore = (t: string, q: string) => {
  if (!t || !q) return 0;
  const title = t.toLowerCase(); const query = q.toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 50;
  if (title.includes(query)) return 10;
  return 0;
};

// ==========================================
// 3. UI COMPONENTS (Ping-Pong Marquee + Perfect UI)
// ==========================================

// Smart Ping-Pong Marquee (Calculates Exact Overflow)
const PingPongMarquee = ({ text, className, isCentered = false }: { text: string, className: string, isCentered?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.clientWidth;
        const sWidth = textRef.current.scrollWidth;
        if (sWidth > cWidth) {
          setDistance(sWidth - cWidth);
        } else {
          setDistance(0);
        }
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  const style = distance > 0 ? {
    '--distance': `-${distance}px`,
    animation: `ping-pong ${Math.max(3, text.length * 0.12)}s ease-in-out infinite alternate`,
  } as React.CSSProperties : {};

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full ${isCentered ? 'text-center' : 'text-left'} ${className}`}>
      <span ref={textRef} className={`inline-block ${distance > 0 ? 'animate-ping-pong' : ''}`} style={style}>
        {text}
      </span>
    </div>
  );
};

interface CardProps { item: any; onClick: (item: any, type: string) => void; tabType?: string; }

const TopHeroCard = ({ item, onClick }: CardProps) => {
  const type = item.type || "song";
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artist" || type === "artists";

  return (
    <div 
      onClick={() => onClick(item, type)}
      className="group relative flex flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] bg-[#111] hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer border border-[#222]"
    >
      <div className={`relative w-24 h-24 sm:w-36 sm:h-36 flex-shrink-0 bg-black overflow-hidden ${isCircular ? 'rounded-full' : 'rounded-xl sm:rounded-2xl'}`}>
        <img draggable={false} src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover pointer-events-none" />
      </div>
      <div className="flex flex-col flex-1 justify-center h-full min-w-0">
        <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-widest text-emerald-400 mb-1 sm:mb-2">Top Result</span>
        <PingPongMarquee text={title} className="text-2xl sm:text-4xl font-black text-white leading-tight" />
        <PingPongMarquee text={subtitle} className="text-white/50 font-semibold text-sm sm:text-lg mt-1" />
      </div>
      <div className="absolute right-4 bottom-4 w-12 h-12 bg-white text-black rounded-full items-center justify-center hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={20} className="fill-black ml-1" />
      </div>
    </div>
  );
};

const TrackRow = forwardRef<HTMLDivElement, CardProps>(({ item, onClick }, ref) => {
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, item.type || "song"));
  return (
    <div 
      ref={ref} onClick={() => onClick(item, item.type || "song")}
      className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-[#111] active:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer border border-transparent hover:border-[#222]"
    >
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md sm:rounded-xl overflow-hidden flex-shrink-0 bg-black">
        <img draggable={false} src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play size={18} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <PingPongMarquee text={title} className="text-[15px] sm:text-[16px] font-bold text-white/90" />
        <PingPongMarquee text={subtitle} className="text-[13px] text-white/50 font-medium mt-0.5" />
      </div>
    </div>
  );
});
TrackRow.displayName = "TrackRow";

const MediaGridCard = forwardRef<HTMLDivElement, CardProps>(({ item, tabType, onClick }, ref) => {
  const type = item.type || tabType || "album";
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div ref={ref} onClick={() => onClick(item, type)} className="flex flex-col gap-2 sm:gap-3 group active:scale-[0.95] transition-all duration-200 cursor-pointer">
      <div className={`relative w-full aspect-square overflow-hidden bg-[#111] border border-[#222] ${isCircular ? "rounded-full" : "rounded-xl sm:rounded-2xl"}`}>
        <img draggable={false} src={getImageUrl(item.image)} alt={title} loading="lazy" className="w-full h-full object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={24} className="text-white fill-white" />
        </div>
      </div>
      <div className={`flex flex-col px-1 ${isCircular ? "items-center" : "items-start"}`}>
        <PingPongMarquee text={title} isCentered={isCircular} className={`text-[13px] sm:text-[14px] font-bold text-white/90 leading-snug w-full`} />
        {subtitle && <PingPongMarquee text={subtitle} isCentered={isCircular} className="text-[11px] sm:text-[12px] font-medium text-white/50 mt-0.5 w-full" />}
      </div>
    </div>
  );
});
MediaGridCard.displayName = "MediaGridCard";


// ==========================================
// 4. MAIN SEARCH PAGE
// ==========================================
export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);
  const searchActiveRef = useRef<boolean>(false);
  const CACHE_KEY = "search_page_cache_v7_black_perfect";

  const[isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const[debouncedQuery, setDebouncedQuery] = useState(""); 
  const [activeTab, setActiveTab] = useState("all");

  const[allData, setAllData] = useState<any>({ topMatches:[], songs: [], personalized:[], albums:[], playlists:[], artists:[] });
  const[results, setResults] = useState<any[]>([]);
  const[page, setPage] = useState(1);
  const[hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const[loadingMore, setLoadingMore] = useState(false);
  
  const[suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const[isListening, setIsListening] = useState(false);

  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All", icon: LayoutGrid },
    { id: "personalized", label: "Personalised", icon: Sparkles }, 
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: User }
  ];

  // --- Hydration & Caching ---
  useEffect(() => { getAuthData(); },[]);
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 8 * 60 * 60 * 1000)) {
          const d = parsed.data;
          setQuery(d.query || ""); setDebouncedQuery(d.debouncedQuery || ""); setActiveTab(d.activeTab || "all");
          setAllData(d.allData || { topMatches: [], songs:[], personalized:[], albums:[], playlists:[], artists:[] });
          setResults(d.results ||[]); setPage(d.page || 1); setHasMore(d.hasMore ?? true);
          if (d.lastFetched) lastFetched.current = d.lastFetched;
        } else localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
    }
    setIsRestored(true);
  },[]);

  useEffect(() => {
    if (!isRestored) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: { query, debouncedQuery, activeTab, allData, results, page, hasMore, lastFetched: lastFetched.current } }));
  },[query, debouncedQuery, activeTab, allData, results, page, hasMore, isRestored]);

  // --- Strict Suggestions Engine ---
  useEffect(() => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (!query.trim() || query === debouncedQuery || searchActiveRef.current) { 
      setSuggestions([]); setShowSuggestions(false); return; 
    }
    
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://ayushser2.vercel.app/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (searchActiveRef.current) return;
        if (data.success && data.results) { setSuggestions(data.results); setShowSuggestions(true); }
      } catch (e) {}
    };
    suggestionTimer.current = setTimeout(fetchSuggestions, 200);
    return () => { if (suggestionTimer.current) clearTimeout(suggestionTimer.current); };
  }, [query, debouncedQuery]);

  const executeSearch = (val: string) => {
    if (!val.trim()) return;
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    searchActiveRef.current = true;
    setQuery(val); 
    setDebouncedQuery(val);
    setSuggestions([]); 
    setShowSuggestions(false);
    inputRef.current?.blur();
    setTimeout(() => { searchActiveRef.current = false; }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch(query);
  };

  // --- Voice Search (Synced Animation) ---
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false; // Prevents endless OS beeping
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      executeSearch(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const fetchPersonalizedData = async (searchQuery: string, limit: number, offset: number) => {
    try {
      const auth = await getAuthData();
      if (!auth || !auth.accessToken) return[];
      const res = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(searchQuery)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=${limit}&offset=${offset}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.results ||[]);
      return raw.map((item: any) => ({
        ...item, type: "personalized", id: item.spotify_url || Date.now().toString(),
        title: item.song_name || "Unknown Track", name: item.song_name || "Unknown Track",
        artist: item.artist || "Unknown Artist", image: item.image, url: item.spotify_url || ""
      }));
    } catch (e) { return[]; }
  };

  useEffect(() => {
    if (!isRestored) return;
    if (!debouncedQuery.trim()) {
      setAllData({ topMatches:[], songs:[], personalized:[], albums: [], playlists:[], artists:[] });
      setResults([]); setHasMore(true); lastFetched.current = { query: "", tab: activeTab, page: 1 }; return;
    }

    const isNewQueryOrTab = debouncedQuery !== lastFetched.current.query || activeTab !== lastFetched.current.tab;
    if (isNewQueryOrTab && page !== 1) { setPage(1); setHasMore(true); return; }
    if (!isNewQueryOrTab && page === lastFetched.current.page) return;

    const fetchData = async () => {
      if (isNewQueryOrTab && activeTab !== "all") setResults([]);
      if (page === 1) setLoading(true); else setLoadingMore(true);

      try {
        if (activeTab === "all") {
          const[sRes, aRes, pRes, arRes, persRes] = await Promise.all([
            fetch(`https://ayushm-psi.vercel.app/api/search/songs?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/albums?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/playlists?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/artists?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetchPersonalizedData(debouncedQuery, 5, 0)
          ]);

          const combined =[
            ...(sRes.data?.results || sRes.data ||[]).map((i: any) => ({ ...i, type: "song" })),
            ...(aRes.data?.results || aRes.data ||[]).map((i: any) => ({ ...i, type: "album" })),
            ...(pRes.data?.results || pRes.data ||[]).map((i: any) => ({ ...i, type: "playlist" })),
            ...(arRes.data?.results || arRes.data ||[]).map((i: any) => ({ ...i, type: "artist" }))
          ];
          const sortedMatches = combined.map(item => ({ item, score: getMatchScore(item.title || item.name, debouncedQuery) }))
            .filter(match => match.score > 0).sort((a, b) => b.score - a.score).map(match => match.item).slice(0, 4);

          setAllData({ 
            topMatches: sortedMatches.length > 0 ? sortedMatches : combined.slice(0, 4), 
            songs: sRes.data?.results || sRes.data ||[], 
            personalized: persRes ||[],
            albums: aRes.data?.results || aRes.data ||[], 
            playlists: pRes.data?.results || pRes.data ||[], 
            artists: arRes.data?.results || arRes.data ||[] 
          });
          setHasMore(false);
        } else if (activeTab === "personalized") {
          const newData = await fetchPersonalizedData(debouncedQuery, 20, (page - 1) * 20);
          setResults(prev => (isNewQueryOrTab || page === 1) ? newData : [...prev, ...newData]); setHasMore(newData.length > 0);
        } else {
          const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${activeTab}?query=${encodeURIComponent(debouncedQuery)}&page=${page}`);
          const json = await res.json();
          const newData = json.data?.results || json.data ||[];
          setResults(prev => (isNewQueryOrTab || page === 1) ? newData :[...prev, ...newData]); setHasMore(newData.length > 0);
        }
        lastFetched.current = { query: debouncedQuery, tab: activeTab, page };
      } catch (err) {} finally { setLoading(false); setLoadingMore(false); }
    };
    fetchData();
  },[debouncedQuery, activeTab, page, isRestored]);

  const lastVerticalElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "400px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore, activeTab]);

  const handleItemClick = async (item: any, passedType?: string) => {
    const type = item.type || passedType || activeTab;
    if (type === "personalized") {
      const querySong = item.song_name || item.title || item.name || "";
      const queryArtist = item.artist || item.artists || "";
      try {
        const res = await fetch(`https://serverayush.vercel.app/api/search?q=${encodeURIComponent(querySong)}&artist=${encodeURIComponent(queryArtist)}`);
        const proData = await res.json();
        if (!proData || !proData.StreamLinks?.length) throw new Error("Empty");
        const songObj = {
          ...proData, id: proData.PermaUrl || item.id || Date.now().toString(), title: proData.Title || item.title, name: proData.Title || item.name, image: proData.Bannerlink || item.image, artists: proData.Artists || item.artist, primaryArtists: proData.Artists || item.artist, url: proData.PermaUrl || item.url, spotifyUrl: item.spotify_url || item.url, downloadUrl: proData.StreamLinks.map((l: any) => ({ quality: l.quality, url: l.url, link: l.url })), type: "song" 
        };
        setPlayContext({ type: "Search", name: "Personalised Search" }); setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
      } catch (err) {
        try {
           const ytRes = await fetch(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(`${querySong} ${queryArtist} official video`)}`);
           const ytData = await ytRes.json();
           if (ytData?.top_result?.videoId) {
             const songObj = { id: item.id || Date.now().toString(), title: querySong, name: querySong, artists: queryArtist, image: item.image, url: item.url, ytVideoId: ytData.top_result.videoId, isProFallback: true, type: "song" };
             setPlayContext({ type: "Search" }); setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
           }
        } catch (e) {}
      }
      return;
    }
    let link = item.url || item.perma_url || item.action || "";
    if (link && !link.startsWith("http")) link = `https://www.jiosaavn.com${link}`;
    let path = link; try { path = new URL(link).pathname; } catch (e) { path = link.replace("https://www.jiosaavn.com", ""); }

    if (type === "songs" || type === "song") { setPlayContext({ type: "Search" }); setQueue([item]); setCurrentSong(item); setIsPlaying(true); }
    else if (type === "albums" || type === "album" || type === "playlists" || type === "playlist") router.push(path);
    else if (type === "artists" || type === "artist") router.push(`/artist?id=${item.id}`);
  };

  if (!isRestored) return <div className="min-h-screen bg-black" />;

  return (
    <main 
      className="min-h-screen pb-32 font-sans overflow-x-hidden relative bg-black text-white"
      style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* 🚀 CSS INJECTIONS FOR PING-PONG MARQUEE */}
      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(var(--distance, 0)); }
        }
        .animate-ping-pong {
          animation-name: ping-pong;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
      `}} />

      {/* 🔮 STATIC, HIGH-PERFORMANCE HEADER */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-[#222] pt-4 sm:pt-8 pb-3 shadow-md">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6">
          
          <div className="relative w-full">
            <div className={`flex items-center w-full bg-[#111] focus-within:bg-[#1a1a1a] border border-[#333] focus-within:border-[#555] rounded-xl h-12 sm:h-14 px-3 sm:px-4 transition-colors`}>
              <SearchIcon size={20} className="text-white/50 flex-shrink-0" />
              <input 
                ref={inputRef}
                className="w-full h-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-white px-3 placeholder-white/40"
                placeholder="What do you want to play?"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} className="p-2 text-white/50 hover:text-white active:scale-90 transition-all rounded-full">
                  <X size={18} />
                </button>
              )}
              <div className="w-px h-6 bg-[#333] mx-2" />
              
              {/* Perfectly Synced Mic Button */}
              <button 
                onClick={handleVoiceSearch} 
                className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isListening ? 'text-emerald-400' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60"></span>
                )}
                <Mic size={20} className="relative z-10" />
              </button>
            </div>

            {/* Suggestions List */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden z-[100] py-1">
                  {suggestions.map((s, i) => (
                     <div 
                       key={i} 
                       onClick={() => executeSearch(s.text)} 
                       className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] active:bg-[#222] transition-colors"
                     >
                        <SearchIcon size={14} className="text-white/30 flex-shrink-0" />
                        <span className="text-white/90 text-[14px] sm:text-[15px] font-medium truncate">
                          {s.runs ? s.runs.map((r: any, j: number) => <span key={j} className={r.bold ? "font-bold text-white" : "text-white/60"}>{r.text}</span>) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* Scrollable Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar snap-x w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`flex items-center gap-1.5 flex-shrink-0 snap-start px-4 py-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-all duration-200 active:scale-[0.95] ${
                    isActive ? "bg-white text-black" : "bg-[#111] text-white/70 border border-[#222] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {tab.icon && <tab.icon size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* 📚 MAIN CONTENT ZONE */}
      <div className="relative z-10 pt-6 max-w-[1200px] mx-auto px-3 sm:px-6">
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white/50" size={32} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-[#111] rounded-2xl flex items-center justify-center mb-5 border border-[#222]">
              <AudioWaveform size={28} className="text-white/30" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Search for Music</h1>
            <p className="text-white/50 font-medium mt-2 text-sm sm:text-base">Find your favorite tracks, artists, and albums.</p>
          </div>
        ) : activeTab === "all" ? (
          
          <div className="flex flex-col xl:flex-row gap-6 xl:gap-10 pb-10">
             <div className="w-full xl:w-[45%] flex flex-col gap-6 sm:gap-8">
                {allData.topMatches.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                      Top Result
                    </h2>
                    <TopHeroCard item={allData.topMatches[0]} onClick={handleItemClick} />
                  </div>
                )}
                
                {allData.songs.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                      Top Songs
                    </h2>
                    <div className="flex flex-col gap-1">
                      {allData.songs.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}

                {allData.personalized.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                      Personalised Results
                    </h2>
                    <div className="flex flex-col gap-1">
                      {allData.personalized.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             <div className="w-full xl:w-[55%] flex flex-col gap-6 sm:gap-8">
                {allData.albums.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                      Albums
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-3 sm:gap-4">
                      {allData.albums.slice(0, 6).map((album: any, i: number) => (
                         <MediaGridCard key={i} item={album} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
                
                {allData.artists.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                      Artists
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-3 sm:gap-4">
                      {allData.artists.slice(0, 4).map((artist: any, i: number) => (
                         <MediaGridCard key={i} item={artist} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

        ) : (
          
          <div className="pb-10">
            {activeTab === "songs" || activeTab === "personalized" ? (
              <div className="flex flex-col w-full max-w-3xl mx-auto">
                {results.map((item, i) => <TrackRow ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {results.map((item, i) => <MediaGridCard ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            )}
            
            <div className="h-20 mt-4 flex justify-center items-center">
              {loadingMore && <Loader2 className="animate-spin text-white/40" size={24} />}
            </div>
          </div>

        )}
      </div>

    </main>
  );
}
