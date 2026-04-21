"use client";
import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  Mic2, X, Mic, Play, Sparkles, Flame, ChevronRight
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// --- PRO AUTH & CACHE ENGINE ---
const AUTH_STORAGE_KEY = 'spotify_app_auth';
let ongoingAuthPromise: Promise<any> | null = null;

export const getCachedAuth = () => {
  try {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      const authData = JSON.parse(cached);
      if (Date.now() < (authData.accessTokenExpirationTimestampMs - 10000)) return authData;
    }
  } catch (e) {
    console.error("Error reading cache:", e);
  }
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
// NEW UI COMPONENTS (LAG-FREE, BENTO/LIST/GRID)
// ==========================================

// 1. TOP RESULT (BENTO HERO CARD)
const TopHeroCard = ({ item, onClick }: { item: any, onClick: any }) => {
  const type = item.type || "song";
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const imgUrl = getImageUrl(item.image);

  return (
    <div 
      onClick={() => onClick(item, type)}
      className="group relative overflow-hidden rounded-[32px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row shadow-2xl"
    >
      <div className="relative w-full sm:w-[220px] aspect-square sm:aspect-auto flex-shrink-0">
        <img src={imgUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/20 sm:to-transparent" />
      </div>
      <div className="flex flex-col justify-end sm:justify-center p-6 sm:p-8 flex-1 relative z-10 -mt-20 sm:mt-0">
        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mb-4 transform sm:translate-y-4 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
          <Play size={24} className="fill-black ml-1" />
        </div>
        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Top Result</span>
        <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md line-clamp-2">{title}</h3>
        <p className="text-white/60 font-medium text-lg mt-2 line-clamp-1">{subtitle}</p>
      </div>
    </div>
  );
};

// 2. SONG ROW (APPLE MUSIC / SPOTIFY LIST STYLE)
const TrackRow = forwardRef<HTMLDivElement, any>(({ item, onClick }, ref) => {
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, item.type || "song"));
  return (
    <div 
      ref={ref}
      onClick={() => onClick(item, item.type || "song")}
      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800">
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <Play size={16} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-bold text-white truncate">{title}</span>
        <span className="text-sm font-medium text-white/50 truncate mt-0.5">{subtitle}</span>
      </div>
    </div>
  );
});
TrackRow.displayName = "TrackRow";

// 3. MODERN MEDIA GRID CARD (ALBUMS/ARTISTS)
const MediaGridCard = forwardRef<HTMLDivElement, any>(({ item, onClick }, ref) => {
  const type = item.type || "album";
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div ref={ref} onClick={() => onClick(item, type)} className="group cursor-pointer flex flex-col gap-3">
      <div className={`relative w-full aspect-square overflow-hidden bg-neutral-900 ${isCircular ? "rounded-full" : "rounded-2xl"}`}>
        <img src={getImageUrl(item.image)} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="flex flex-col px-1 text-center sm:text-left">
        <span className="text-sm sm:text-base font-bold text-white truncate">{title}</span>
        {subtitle && <span className="text-xs sm:text-sm font-medium text-white/50 truncate mt-0.5">{subtitle}</span>}
      </div>
    </div>
  );
});
MediaGridCard.displayName = "MediaGridCard";


export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const CACHE_KEY = "search_page_cache_ultimate_v2";

  const[isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const[activeTab, setActiveTab] = useState("all");

  const [allData, setAllData] = useState<any>({ topMatches:[], songs: [], albums:[], playlists: [], artists:[] });
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const[hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showNav, setShowNav] = useState(true);
  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All" },
    { id: "pro", label: "Pro", icon: Flame, isPremium: true }, 
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  // --- Optimized Scroll Listener (No Lag) ---
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;
    
    const updateNav = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 100 && currentScrollY > lastScrollY) setShowNav(false);
      else setShowNav(true);
      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) { window.requestAnimationFrame(updateNav); ticking = true; }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  // Cache & Auth logic (same structure, untouched logic)
  useEffect(() => { getAuthData(); },[]);
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < 8 * 60 * 60 * 1000)) {
          const d = parsed.data;
          setQuery(d.query || ""); setDebouncedQuery(d.debouncedQuery || ""); setActiveTab(d.activeTab || "all");
          setAllData(d.allData || { topMatches: [], songs:[], albums: [], playlists:[], artists:[] });
          setResults(d.results ||[]); setPage(d.page || 1); setHasMore(d.hasMore ?? true);
          if (d.lastFetched) lastFetched.current = d.lastFetched;
        } else localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
    }
    setIsRestored(true);
  },[]);

  useEffect(() => {
    if (!isRestored) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: { query, debouncedQuery, activeTab, allData, results, page, hasMore, lastFetched: lastFetched.current }
    }));
  },[query, debouncedQuery, activeTab, allData, results, page, hasMore, isRestored]);

  // Suggestions Fetcher
  useEffect(() => {
    if (!query.trim() || query === debouncedQuery) {
      setSuggestions([]); setShowSuggestions(false); return;
    }
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

  // Execute True Search
  const executeSearch = (val: string) => {
    if (!val.trim()) return;
    setQuery(val); setDebouncedQuery(val);
    setSuggestions([]); setShowSuggestions(false);
    inputRef.current?.blur(); // Hides keyboard perfectly
  };

  useEffect(() => {
    if (!isRestored) return;
    if (!debouncedQuery.trim()) {
      setAllData({ topMatches:[], songs:[], albums: [], playlists: [], artists:[] });
      setResults([]); setHasMore(true); lastFetched.current = { query: "", tab: activeTab, page: 1 };
      return;
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

  const lastVerticalElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "600px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore, activeTab]);

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

  // Lag-Free GPU Background Glow Extraction
  const globalBgImage = allData?.topMatches?.[0]?.image || results?.[0]?.image || null;

  if (!isRestored) return <div className="min-h-screen bg-[#0a0a0a]" />;

  return (
    <main className="min-h-screen pb-32 bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-white/20 font-sans">
      
      {/* 🚀 GPU-ACCELERATED ZERO-LAG BACKGROUND */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        {globalBgImage && (
           <div 
             className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-cover bg-center opacity-[0.15] transform-gpu will-change-transform transition-opacity duration-1000 ease-in-out blur-[80px]"
             style={{ backgroundImage: `url(${getImageUrl(globalBgImage)})` }}
           />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/50 via-[#0a0a0a]/90 to-[#0a0a0a]" />
      </div>

      {/* 🔮 NEW MORPHING / FLOATING HEADER */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="absolute inset-0 bg-[#0a0a0a]/70 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative pt-12 pb-4 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col items-center">
          
          {/* MASSIVE SEARCH BAR */}
          <div className="relative w-full">
            <div className="flex items-center w-full bg-white/[0.05] hover:bg-white/[0.08] focus-within:bg-white/[0.1] border border-white/10 rounded-[28px] h-[72px] px-6 transition-colors duration-300">
              <SearchIcon size={28} className="text-white/40 flex-shrink-0" />
              <input 
                ref={inputRef}
                className="w-full h-full bg-transparent border-none outline-none text-2xl sm:text-3xl font-black text-white px-5 placeholder-white/20 tracking-tight"
                placeholder="What do you want to play?"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} className="text-white/30 hover:text-white transition-colors p-2">
                  <X size={24} />
                </button>
              )}
            </div>

            {/* SLEEK SUGGESTIONS DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[84px] left-0 right-0 bg-[#121212] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden z-[100] py-2">
                  {suggestions.map((s, i) => (
                     <div key={i} onClick={() => executeSearch(s.text)} className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                        <SearchIcon size={20} className="text-white/20" />
                        <span className="text-white/90 text-[18px] font-medium tracking-tight">
                          {s.runs ? s.runs.map((r: any, j: number) => <span key={j} className={r.bold ? "font-bold text-white" : "opacity-60"}>{r.text}</span>) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* CLEAN PILL TABS */}
          <div className="flex gap-2 mt-6 overflow-x-auto hide-scrollbar w-full pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`px-5 py-2.5 rounded-full text-[15px] font-bold transition-all duration-200 whitespace-nowrap ${
                    isActive ? (tab.isPremium ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white" : "bg-white text-black") 
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 📚 MAIN CONTENT LAYOUT (BENTO / LIST / GRID) */}
      <div className="relative z-10 pt-[240px] max-w-7xl mx-auto px-4 sm:px-8">
        
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-white/30" size={40} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center mt-32 text-center">
            <h1 className="text-5xl sm:text-7xl font-black text-white/10 tracking-tighter">Search</h1>
          </div>
        ) : activeTab === "all" ? (
          
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
             {/* LEFT COLUMN: Top Result & Songs */}
             <div className="w-full md:w-1/2 flex flex-col gap-8">
                {allData.topMatches.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-white mb-4">Top Result</h2>
                    <TopHeroCard item={allData.topMatches[0]} onClick={handleItemClick} />
                  </div>
                )}
                
                {allData.songs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-white mb-4">Songs</h2>
                    <div className="flex flex-col">
                      {allData.songs.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             {/* RIGHT COLUMN: Albums & Artists Grids */}
             <div className="w-full md:w-1/2 flex flex-col gap-8">
                {allData.albums.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-white mb-4">Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {allData.albums.slice(0, 6).map((album: any, i: number) => (
                         <MediaGridCard key={i} item={album} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
                
                {allData.artists.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-white mb-4">Artists</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {allData.artists.slice(0, 4).map((artist: any, i: number) => (
                         <MediaGridCard key={i} item={artist} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

        ) : (
          
          // TAB SPECIFIC VIEWS
          <div>
            <h2 className="text-3xl font-black text-white mb-6 capitalize">{activeTab}</h2>
            {activeTab === "songs" || activeTab === "pro" ? (
              <div className="flex flex-col gap-1 max-w-3xl">
                {results.map((item, i) => <TrackRow ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {results.map((item, i) => <MediaGridCard ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            )}
            
            <div className="h-24 mt-8 flex justify-center items-center">
              {loadingMore && <Loader2 className="animate-spin text-white/30" size={32} />}
            </div>
          </div>

        )}
      </div>
    </main>
  );
}
