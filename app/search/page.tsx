"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  User, X, Mic, Play, Flame, LayoutGrid, Sparkles, AudioWaveform
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
  } catch (e) { console.error(e); }
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
  if (type === "pro") return item.artist || item.artists || "Pro Track";
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
// 3. UI COMPONENTS (Glassmorphism + Symbols)
// ==========================================
interface CardProps { item: any; onClick: (item: any, type: string) => void; tabType?: string; isPro?: boolean; }

const TopHeroCard = ({ item, onClick }: CardProps) => {
  const type = item.type || "song";
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artist" || type === "artists";

  return (
    <div 
      onClick={() => onClick(item, type)}
      className="group relative flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-[28px] bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-2xl"
    >
      <div className={`relative w-32 h-32 sm:w-44 sm:h-44 flex-shrink-0 bg-white/10 shadow-2xl overflow-hidden ${isCircular ? 'rounded-full' : 'rounded-2xl'}`}>
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="flex flex-col flex-1 text-center sm:text-left justify-center h-full pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 border border-white/20 w-max mb-3 mx-auto sm:mx-0">
          <Sparkles size={14} className="text-yellow-300" />
          <span className="text-[12px] font-bold uppercase tracking-widest text-white">Top Match</span>
        </div>
        <h3 className="text-3xl sm:text-5xl font-black text-white line-clamp-2 leading-tight drop-shadow-md">{title}</h3>
        <p className="text-white/80 font-semibold text-lg mt-2 line-clamp-1 drop-shadow-sm">{subtitle}</p>
      </div>
      
      <div className="absolute right-6 bottom-6 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hidden sm:flex">
        <Play size={24} className="fill-black ml-1" />
      </div>
    </div>
  );
};

const TrackRow = forwardRef<HTMLDivElement, CardProps>(({ item, onClick, isPro }, ref) => {
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, item.type || "song"));
  return (
    <div 
      ref={ref} onClick={() => onClick(item, item.type || "song")}
      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/20 active:bg-white/30 active:scale-[0.98] transition-all duration-200 cursor-pointer border border-transparent hover:border-white/20 shadow-sm"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 shadow-md">
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold text-white truncate drop-shadow-sm">{title}</span>
          {isPro && <Flame size={14} className="text-pink-400 flex-shrink-0" />}
        </div>
        <span className="text-[14px] text-white/70 font-medium truncate mt-0.5">{subtitle}</span>
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
    <div ref={ref} onClick={() => onClick(item, type)} className="flex flex-col gap-3 group active:scale-[0.95] transition-all duration-200 cursor-pointer">
      <div className={`relative w-full aspect-square overflow-hidden bg-white/10 shadow-lg border border-white/10 group-hover:border-white/30 transition-colors ${isCircular ? "rounded-full" : "rounded-[24px]"}`}>
        <img src={getImageUrl(item.image)} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
             <Play size={20} className="text-white fill-white ml-1" />
           </div>
        </div>
      </div>
      <div className="flex flex-col px-1 text-center">
        <span className="text-[15px] font-black text-white truncate drop-shadow-sm">{title}</span>
        {subtitle && <span className="text-[13px] font-semibold text-white/70 truncate mt-0.5">{subtitle}</span>}
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
  const CACHE_KEY = "search_page_cache_v5";

  const[isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const [activeTab, setActiveTab] = useState("all");

  const[allData, setAllData] = useState<any>({ topMatches:[], songs: [], pro: [], albums:[], playlists:[], artists:[] });
  const [results, setResults] = useState<any[]>([]);
  const[page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const[loadingMore, setLoadingMore] = useState(false);
  
  const[suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const[isListening, setIsListening] = useState(false);

  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All", icon: LayoutGrid },
    { id: "pro", label: "Pro Tracks", icon: Flame, isPremium: true }, 
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: User }
  ];

  // --- Core Lifecycle & Cache ---
  useEffect(() => { getAuthData(); },[]);
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 8 * 60 * 60 * 1000)) {
          const d = parsed.data;
          setQuery(d.query || ""); setDebouncedQuery(d.debouncedQuery || ""); setActiveTab(d.activeTab || "all");
          setAllData(d.allData || { topMatches: [], songs:[], pro:[], albums:[], playlists:[], artists:[] });
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

  // --- Strict Suggestions Engine (Fixes the Race Condition Bug) ---
  useEffect(() => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    
    if (!query.trim() || query === debouncedQuery || searchActiveRef.current) { 
      setSuggestions([]); setShowSuggestions(false); return; 
    }
    
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://ayushser2.vercel.app/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        // If user submitted search while this was fetching, ignore results.
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
    
    searchActiveRef.current = true; // Lock suggestions from appearing
    setQuery(val); 
    setDebouncedQuery(val);
    setSuggestions([]); 
    setShowSuggestions(false);
    inputRef.current?.blur(); // Force close keyboard
    
    setTimeout(() => { searchActiveRef.current = false; }, 1000); // Unlock after search starts
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch(query);
  };

  // --- Speech / Voice Search ---
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice search is not supported in this browser."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      executeSearch(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // --- Central Data Fetcher (Now includes Pro inside "All") ---
  const fetchProData = async (searchQuery: string, limit: number, offset: number) => {
    try {
      const auth = await getAuthData();
      if (!auth || !auth.accessToken) return[];
      const res = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(searchQuery)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=${limit}&offset=${offset}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.results ||[]);
      return raw.map((item: any) => ({
        ...item, type: "pro", id: item.spotify_url || Date.now().toString(),
        title: item.song_name || "Unknown Track", name: item.song_name || "Unknown Track",
        artist: item.artist || "Unknown Artist", image: item.image, url: item.spotify_url || ""
      }));
    } catch (e) { return[]; }
  };

  useEffect(() => {
    if (!isRestored) return;
    if (!debouncedQuery.trim()) {
      setAllData({ topMatches:[], songs:[], pro:[], albums: [], playlists:[], artists:[] });
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
          const[sRes, aRes, pRes, arRes, proRes] = await Promise.all([
            fetch(`https://ayushm-psi.vercel.app/api/search/songs?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/albums?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/playlists?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(`https://ayushm-psi.vercel.app/api/search/artists?query=${encodeURIComponent(debouncedQuery)}&page=1`).then(r=>r.json()).catch(()=>({data:[]})),
            fetchProData(debouncedQuery, 5, 0)
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
            songs: sRes.data?.results || sRes.data || [], 
            pro: proRes || [],
            albums: aRes.data?.results || aRes.data ||[], 
            playlists: pRes.data?.results || pRes.data ||[], 
            artists: arRes.data?.results || arRes.data ||[] 
          });
          setHasMore(false);
        } else if (activeTab === "pro") {
          const newData = await fetchProData(debouncedQuery, 20, (page - 1) * 20);
          setResults(prev => (isNewQueryOrTab || page === 1) ? newData : [...prev, ...newData]); setHasMore(newData.length > 0);
        } else {
          const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${activeTab}?query=${encodeURIComponent(debouncedQuery)}&page=${page}`);
          const json = await res.json();
          const newData = json.data?.results || json.data ||[];
          setResults(prev => (isNewQueryOrTab || page === 1) ? newData : [...prev, ...newData]); setHasMore(newData.length > 0);
        }
        lastFetched.current = { query: debouncedQuery, tab: activeTab, page };
      } catch (err) {} finally { setLoading(false); setLoadingMore(false); }
    };
    fetchData();
  },[debouncedQuery, activeTab, page, isRestored]);

  // --- Infinite Scroll ---
  const lastVerticalElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "400px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore, activeTab]);

  // --- Routing & Playback ---
  const handleItemClick = async (item: any, passedType?: string) => {
    const type = item.type || passedType || activeTab;
    if (type === "pro") {
      const querySong = item.song_name || item.title || item.name || "";
      const queryArtist = item.artist || item.artists || "";
      try {
        const res = await fetch(`https://serverayush.vercel.app/api/search?q=${encodeURIComponent(querySong)}&artist=${encodeURIComponent(queryArtist)}`);
        const proData = await res.json();
        if (!proData || !proData.StreamLinks?.length) throw new Error("Empty");
        const songObj = {
          ...proData, id: proData.PermaUrl || item.id || Date.now().toString(), title: proData.Title || item.title, name: proData.Title || item.name, image: proData.Bannerlink || item.image, artists: proData.Artists || item.artist, primaryArtists: proData.Artists || item.artist, url: proData.PermaUrl || item.url, spotifyUrl: item.spotify_url || item.url, downloadUrl: proData.StreamLinks.map((l: any) => ({ quality: l.quality, url: l.url, link: l.url })), type: "song" 
        };
        setPlayContext({ type: "Search", name: "Pro Search" }); setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
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

  const globalBgImage = allData?.topMatches?.[0]?.image || results?.[0]?.image || null;

  if (!isRestored) return <div className="min-h-screen bg-neutral-900" />;

  return (
    <main className="min-h-screen pb-32 font-sans overflow-x-hidden selection:bg-white/40 relative text-white">
      
      {/* 🚀 LIGHT, VIBRANT & COLORFUL BACKGROUND */}
      <div className="fixed inset-0 z-[0] pointer-events-none bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
         {/* Animated Glassmorphism Blobs */}
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-400/50 blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-yellow-400/40 blur-[140px] mix-blend-screen" />
         
         {/* Dynamic Artwork Blur */}
         {globalBgImage && (
           <div 
             className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay transition-all duration-1000 ease-in-out"
             style={{ backgroundImage: `url(${getImageUrl(globalBgImage)})`, filter: 'blur(80px) saturate(200%)' }}
           />
         )}
         {/* Glass Overlay to make text legible */}
         <div className="absolute inset-0 bg-black/20 backdrop-blur-[50px]" />
      </div>

      {/* 🔮 STATIC, HIGH-PERFORMANCE HEADER */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-3xl border-b border-white/20 pt-6 sm:pt-10 pb-4 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          
          <div className="relative w-full max-w-2xl mx-auto">
            <div className={`flex items-center w-full bg-white/20 hover:bg-white/30 focus-within:bg-white/40 border border-white/30 rounded-full h-14 sm:h-16 px-4 sm:px-5 transition-all duration-300 shadow-lg ${isListening ? 'ring-4 ring-pink-500/50' : ''}`}>
              <SearchIcon size={24} className="text-white drop-shadow-sm flex-shrink-0" />
              <input 
                ref={inputRef}
                className="w-full h-full bg-transparent border-none outline-none text-[16px] sm:text-[18px] font-bold text-white px-3 sm:px-4 placeholder-white/70"
                placeholder="Search artists, songs, podcasts..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
              />
              {query && (
                <button 
                  onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} 
                  className="p-2 text-white hover:bg-white/20 active:scale-90 transition-all rounded-full"
                >
                  <X size={20} />
                </button>
              )}
              <div className="w-px h-6 bg-white/30 mx-2" />
              <button onClick={handleVoiceSearch} className={`p-2.5 rounded-full transition-all duration-300 ${isListening ? 'bg-pink-500 text-white animate-pulse' : 'text-white hover:bg-white/20'}`}>
                <Mic size={22} />
              </button>
            </div>

            {/* Absolute Suggestions List */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/20 backdrop-blur-3xl border border-white/40 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-[100] py-2">
                  {suggestions.map((s, i) => (
                     <div 
                       key={i} 
                       onClick={() => executeSearch(s.text)} 
                       className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-white/20 active:bg-white/30 transition-colors"
                     >
                        <SearchIcon size={18} className="text-white flex-shrink-0 drop-shadow-sm" />
                        <span className="text-white text-[16px] font-medium truncate drop-shadow-sm">
                          {s.runs ? s.runs.map((r: any, j: number) => <span key={j} className={r.bold ? "font-black" : "opacity-90"}>{r.text}</span>) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* Scrollable Tabs */}
          <div className="flex gap-2 sm:gap-3 mt-5 overflow-x-auto hide-scrollbar snap-x w-full max-w-3xl mx-auto pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`flex items-center gap-2 flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-[14px] font-bold transition-all duration-200 active:scale-[0.95] ${
                    isActive ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "bg-black/20 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  {tab.icon && <tab.icon size={16} className={tab.isPremium && !isActive ? "text-pink-300" : ""} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* 📚 MAIN CONTENT ZONE */}
      <div className="relative z-10 pt-8 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={40} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-24 sm:py-32 text-center px-4 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center mb-6 border border-white/30 shadow-2xl">
              <AudioWaveform size={40} className="text-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">Find Everything.</h1>
            <p className="text-white/80 font-bold mt-4 text-lg sm:text-xl drop-shadow-sm">Type to search the universe of music.</p>
          </div>
        ) : activeTab === "all" ? (
          
          <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 pb-10">
             {/* Left Column (Top Result, Songs, Pro Tracks) */}
             <div className="w-full xl:w-[45%] flex flex-col gap-8">
                {allData.topMatches.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white mb-5 drop-shadow-sm">
                      <Sparkles size={24} /> Best Match
                    </h2>
                    <TopHeroCard item={allData.topMatches[0]} onClick={handleItemClick} />
                  </div>
                )}
                
                {allData.songs.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white mb-5 drop-shadow-sm">
                      <Music2 size={24} /> Top Songs
                    </h2>
                    <div className="flex flex-col gap-1 bg-white/10 p-2 rounded-[24px] border border-white/20 backdrop-blur-md">
                      {allData.songs.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}

                {allData.pro.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white mb-5 drop-shadow-sm">
                      <Flame size={24} className="text-pink-300" /> Pro Tracks
                    </h2>
                    <div className="flex flex-col gap-1 bg-gradient-to-b from-pink-500/20 to-purple-500/20 p-2 rounded-[24px] border border-pink-400/40 backdrop-blur-md">
                      {allData.pro.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} isPro={true} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             {/* Right Column (Albums & Artists) */}
             <div className="w-full xl:w-[55%] flex flex-col gap-8">
                {allData.albums.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white mb-5 drop-shadow-sm">
                      <Disc size={24} /> Albums
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-4 sm:gap-6">
                      {allData.albums.slice(0, 6).map((album: any, i: number) => (
                         <MediaGridCard key={i} item={album} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
                
                {allData.artists.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white mb-5 drop-shadow-sm">
                      <User size={24} /> Artists
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4 sm:gap-6">
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
            {activeTab === "songs" || activeTab === "pro" ? (
              <div className="flex flex-col w-full max-w-4xl mx-auto bg-white/10 p-2 rounded-[28px] border border-white/20 backdrop-blur-md">
                {results.map((item, i) => <TrackRow ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} isPro={activeTab === "pro"} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {results.map((item, i) => <MediaGridCard ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            )}
            
            <div className="h-24 mt-6 flex justify-center items-center">
              {loadingMore && <Loader2 className="animate-spin text-white" size={32} />}
            </div>
          </div>

        )}
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}
