"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  Mic2, X, Mic, Play, Sparkles
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// ==========================================
// 1. AUTH & CACHE ENGINE (Untouched Logic)
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
// 3. UI COMPONENTS (High Performance & Touch Optimized)
// ==========================================

interface CardProps { item: any; onClick: (item: any, type: string) => void; tabType?: string; }

// --- Top Match Hero Card ---
const TopHeroCard = ({ item, onClick }: CardProps) => {
  const type = item.type || "song";
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artist" || type === "artists";

  return (
    <div 
      onClick={() => onClick(item, type)}
      className="group relative flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-[28px] bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-200 cursor-pointer border border-white/[0.05]"
    >
      <div className={`relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-neutral-900 shadow-xl overflow-hidden ${isCircular ? 'rounded-full' : 'rounded-2xl'}`}>
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col flex-1 text-center sm:text-left justify-center h-full">
        <span className="text-[12px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Top Result</span>
        <h3 className="text-3xl sm:text-4xl font-bold text-white line-clamp-2 leading-tight">{title}</h3>
        <p className="text-white/50 font-medium text-base mt-2 line-clamp-1">{subtitle}</p>
      </div>
      
      {/* Floating Play Button for Top Result */}
      <div className="absolute right-6 bottom-6 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hidden sm:flex">
        <Play size={24} className="text-black fill-black ml-1" />
      </div>
    </div>
  );
};

// --- Track List Item (Touch friendly) ---
const TrackRow = forwardRef<HTMLDivElement, CardProps>(({ item, onClick }, ref) => {
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, item.type || "song"));
  return (
    <div 
      ref={ref} 
      onClick={() => onClick(item, item.type || "song")}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.06] active:bg-white/[0.1] active:scale-[0.98] transition-all duration-200 cursor-pointer"
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900">
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[16px] font-semibold text-white truncate">{title}</span>
        <span className="text-[14px] text-white/50 truncate mt-0.5">{subtitle}</span>
      </div>
    </div>
  );
});
TrackRow.displayName = "TrackRow";

// --- Grid Item (Responsive) ---
const MediaGridCard = forwardRef<HTMLDivElement, CardProps>(({ item, tabType, onClick }, ref) => {
  const type = item.type || tabType || "album";
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div 
      ref={ref} 
      onClick={() => onClick(item, type)} 
      className="flex flex-col gap-3 group active:scale-[0.95] active:opacity-80 transition-all duration-200 cursor-pointer"
    >
      <div className={`relative w-full aspect-square overflow-hidden bg-neutral-900 ${isCircular ? "rounded-full" : "rounded-[20px]"}`}>
        <img src={getImageUrl(item.image)} alt={title} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col px-1">
        <span className="text-[15px] font-semibold text-white truncate">{title}</span>
        {subtitle && <span className="text-[13px] text-white/50 truncate mt-0.5">{subtitle}</span>}
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
  const CACHE_KEY = "search_page_cache_v4";

  const[isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const [activeTab, setActiveTab] = useState("all");

  const [allData, setAllData] = useState<any>({ topMatches:[], songs: [], albums:[], playlists: [], artists:[] });
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const[suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All" },
    { id: "pro", label: "Pro API" }, 
    { id: "songs", label: "Songs" },
    { id: "albums", label: "Albums" },
    { id: "playlists", label: "Playlists" },
    { id: "artists", label: "Artists" }
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
          setAllData(d.allData || { topMatches: [], songs:[], albums:[], playlists:[], artists:[] });
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

  // --- Strict Typing / Suggestion Logic ---
  useEffect(() => {
    if (!query.trim() || query === debouncedQuery) { setSuggestions([]); setShowSuggestions(false); return; }
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://ayushser2.vercel.app/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.results) { setSuggestions(data.results); setShowSuggestions(true); }
      } catch (e) {}
    };
    const sTimer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(sTimer);
  }, [query, debouncedQuery]);

  const executeSearch = (val: string) => {
    if (!val.trim()) return;
    setQuery(val); 
    setDebouncedQuery(val);
    setSuggestions([]); 
    setShowSuggestions(false);
    inputRef.current?.blur(); // Dismisses mobile keyboard
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch(query);
  };

  // --- Central Data Fetcher ---
  useEffect(() => {
    if (!isRestored) return;
    if (!debouncedQuery.trim()) {
      setAllData({ topMatches:[], songs:[], albums: [], playlists: [], artists:[] });
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
          const[sRes, aRes, pRes, arRes] = await Promise.all([
            fetch(`https://ayushm-psi.vercel.app/api/search/songs?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/albums?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/playlists?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/artists?query=${encodeURIComponent(debouncedQuery)}&page=1`)
          ]);
          const[sJson, aJson, pJson, arJson] = await Promise.all([sRes.json(), aRes.json(), pRes.json(), arRes.json()]);

          const combined =[
            ...(sJson.data?.results || sJson.data ||[]).map((i: any) => ({ ...i, type: "song" })),
            ...(aJson.data?.results || aJson.data ||[]).map((i: any) => ({ ...i, type: "album" })),
            ...(pJson.data?.results || pJson.data ||[]).map((i: any) => ({ ...i, type: "playlist" })),
            ...(arJson.data?.results || arJson.data ||[]).map((i: any) => ({ ...i, type: "artist" }))
          ];
          const sortedMatches = combined.map(item => ({ item, score: getMatchScore(item.title || item.name, debouncedQuery) }))
            .filter(match => match.score > 0).sort((a, b) => b.score - a.score).map(match => match.item).slice(0, 5);

          setAllData({ 
            topMatches: sortedMatches.length > 0 ? sortedMatches : combined.slice(0, 5), 
            songs: sJson.data?.results || sJson.data ||[], 
            albums: aJson.data?.results || aJson.data ||[], 
            playlists: pJson.data?.results || pJson.data ||[], 
            artists: arJson.data?.results || arJson.data ||[] 
          });
          setHasMore(false);
        } else if (activeTab === "pro") {
          const auth = await getAuthData();
          if (auth && auth.accessToken) {
            const offset = (page - 1) * 20;
            const res = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(debouncedQuery)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=20&offset=${offset}`);
            const data = await res.json();
            const rawResults = Array.isArray(data) ? data : (data.results ||[]);
            const newData = rawResults.map((item: any) => ({
              ...item, type: "pro", id: item.spotify_url || Date.now().toString(),
              title: item.song_name || "Unknown Track", name: item.song_name || "Unknown Track",
              artist: item.artist || "Unknown Artist", image: item.image, url: item.spotify_url || ""
            }));
            setResults(prev => (isNewQueryOrTab || page === 1) ? newData :[...prev, ...newData]); setHasMore(newData.length > 0); 
          } else { setResults([]); setHasMore(false); }
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

  if (!isRestored) return <div className="min-h-screen bg-[#09090b]" />;

  return (
    <main className="min-h-screen pb-32 bg-[#09090b] text-white font-sans overflow-x-hidden selection:bg-emerald-500/30 relative">
      
      {/* 🚀 LAG-FREE BACKGROUND: Pure CSS radial gradients (No expensive blurs/images) */}
      <div className="fixed inset-0 z-[0] pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-900/20 blur-[100px]" />
         <div className="absolute top-[40%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      {/* 🔮 STATIC, HIGH-PERFORMANCE HEADER (Always responsive, no scroll-lag) */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 pt-6 sm:pt-10 pb-4">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          
          {/* Search Input Container */}
          <div className="relative w-full max-w-2xl mx-auto">
            <div className="flex items-center w-full bg-white/[0.06] hover:bg-white/[0.08] focus-within:bg-white/[0.1] border border-white/10 rounded-2xl h-14 sm:h-16 px-4 sm:px-5 transition-all duration-200">
              <SearchIcon size={22} className="text-white/40 flex-shrink-0" />
              <input 
                ref={inputRef}
                className="w-full h-full bg-transparent border-none outline-none text-[16px] sm:text-[18px] font-medium text-white px-3 sm:px-4 placeholder-white/30"
                placeholder="What do you want to play?"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
              />
              {query && (
                <button 
                  onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} 
                  className="p-2 text-white/40 hover:text-white active:scale-90 transition-all rounded-full"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Absolute Suggestions List */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] py-2">
                  {suggestions.map((s, i) => (
                     <div 
                       key={i} 
                       onClick={() => executeSearch(s.text)} 
                       className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors"
                     >
                        <SearchIcon size={16} className="text-white/30 flex-shrink-0" />
                        <span className="text-white/90 text-[15px] sm:text-[16px] truncate">
                          {s.runs ? s.runs.map((r: any, j: number) => <span key={j} className={r.bold ? "font-bold text-white" : "opacity-70"}>{r.text}</span>) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* Scrollable Tabs */}
          <div className="flex gap-2 sm:gap-3 mt-5 overflow-x-auto hide-scrollbar snap-x w-full max-w-2xl mx-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`flex-shrink-0 snap-start px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all duration-200 active:scale-[0.95] ${
                    isActive ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
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
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white/30" size={36} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-24 sm:py-32 text-center px-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
              <Sparkles size={32} className="text-white/40" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Search for Music</h1>
            <p className="text-white/40 mt-3 text-sm sm:text-base">Find your favorite tracks, artists, and albums.</p>
          </div>
        ) : activeTab === "all" ? (
          
          <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
             
             {/* Left Column (Top Result & Songs) */}
             <div className="w-full xl:w-5/12 flex flex-col gap-8">
                {allData.topMatches.length > 0 && (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5">Top Result</h2>
                    <TopHeroCard item={allData.topMatches[0]} onClick={handleItemClick} />
                  </div>
                )}
                
                {allData.songs.length > 0 && (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5">Songs</h2>
                    <div className="flex flex-col">
                      {allData.songs.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             {/* Right Column (Albums & Artists) */}
             <div className="w-full xl:w-7/12 flex flex-col gap-8">
                {allData.albums.length > 0 && (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5">Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 gap-4 sm:gap-6">
                      {allData.albums.slice(0, 6).map((album: any, i: number) => (
                         <MediaGridCard key={i} item={album} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
                
                {allData.artists.length > 0 && (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5">Artists</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
                      {allData.artists.slice(0, 4).map((artist: any, i: number) => (
                         <MediaGridCard key={i} item={artist} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

          </div>

        ) : (
          
          <div>
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
            </div>

            {activeTab === "songs" || activeTab === "pro" ? (
              <div className="flex flex-col w-full max-w-4xl mx-auto">
                {results.map((item, i) => <TrackRow ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {results.map((item, i) => <MediaGridCard ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            )}
            
            <div className="h-24 mt-6 flex justify-center items-center">
              {loadingMore && <Loader2 className="animate-spin text-white/30" size={28} />}
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
