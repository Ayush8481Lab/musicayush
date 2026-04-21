"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  Mic2, X, Mic, Play, Flame 
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
// 2. UTILITY FUNCTIONS
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
// 3. UNIQUE UI COMPONENTS (STRICTLY TYPED)
// ==========================================

// --- Top Result Bento Card ---
interface CardProps { item: any; onClick: (item: any, type: string) => void; tabType?: string; }

const TopHeroCard = ({ item, onClick }: CardProps) => {
  const type = item.type || "song";
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const imgUrl = getImageUrl(item.image);

  return (
    <div 
      onClick={() => onClick(item, type)}
      className="group relative overflow-hidden rounded-[32px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all duration-500 cursor-pointer flex flex-col md:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
    >
      <div className="relative w-full md:w-[260px] aspect-square flex-shrink-0 p-4">
        <div className="w-full h-full rounded-[24px] overflow-hidden shadow-2xl relative">
          <img src={imgUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-300 border border-white/40">
              <Play size={28} className="text-white fill-white ml-1" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8 flex-1 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/5 w-max mb-4">
          <Flame size={14} className="text-pink-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Top Result</span>
        </div>
        <h3 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter drop-shadow-md line-clamp-2">{title}</h3>
        <p className="text-white/50 font-semibold text-lg mt-2 line-clamp-1">{subtitle}</p>
      </div>
    </div>
  );
};

// --- Sleek Song Row ---
const TrackRow = forwardRef<HTMLDivElement, CardProps>(({ item, onClick }, ref) => {
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, item.type || "song"));
  return (
    <div 
      ref={ref} onClick={() => onClick(item, item.type || "song")}
      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.05] transition-all duration-300 cursor-pointer border border-transparent hover:border-white/5"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black shadow-lg">
        <img src={getImageUrl(item.image)} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[16px] font-bold text-white truncate drop-shadow-sm">{title}</span>
        <span className="text-[13px] font-medium text-white/40 truncate mt-0.5">{subtitle}</span>
      </div>
    </div>
  );
});
TrackRow.displayName = "TrackRow";

// --- Dynamic Grid Tile ---
const MediaGridCard = forwardRef<HTMLDivElement, CardProps>(({ item, tabType, onClick }, ref) => {
  const type = item.type || tabType || "album";
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div ref={ref} onClick={() => onClick(item, type)} className="group cursor-pointer flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-2">
      <div className={`relative w-full aspect-square overflow-hidden bg-black shadow-lg border border-white/5 group-hover:border-white/20 transition-colors ${isCircular ? "rounded-full" : "rounded-3xl"}`}>
        <img src={getImageUrl(item.image)} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-300">
             <Play size={20} className="text-white fill-white ml-1" />
          </div>
        </div>
      </div>
      <div className="flex flex-col px-1 text-center">
        <span className="text-[15px] font-black text-white truncate tracking-tight">{title}</span>
        {subtitle && <span className="text-[13px] font-medium text-white/40 truncate mt-0.5">{subtitle}</span>}
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
  const CACHE_KEY = "search_page_cache_ultimate_v3";

  const [isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const [activeTab, setActiveTab] = useState("all");

  const[allData, setAllData] = useState<any>({ topMatches:[], songs: [], albums:[], playlists: [], artists:[] });
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const[loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "Overview" },
    { id: "pro", label: "Pro Audio", icon: Flame, isPremium: true }, 
    { id: "songs", label: "Tracks", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  // --- Fluid Scroll Hide/Show ---
  useEffect(() => {
    let ticking = false; let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 100 && currentScrollY > lastScrollY) setShowNav(false);
          else setShowNav(true);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  // --- State Hydration & Caching ---
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
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: { query, debouncedQuery, activeTab, allData, results, page, hasMore, lastFetched: lastFetched.current } }));
  },[query, debouncedQuery, activeTab, allData, results, page, hasMore, isRestored]);

  // --- Strict Suggestions Engine (Only while typing) ---
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

  // --- Strict Action-Based Search ---
  const executeSearch = (val: string) => {
    if (!val.trim()) return;
    setQuery(val); 
    setDebouncedQuery(val);
    setSuggestions([]); 
    setShowSuggestions(false);
    inputRef.current?.blur(); // Force close mobile keyboard
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch(query);
  };

  // --- Search Fetching Engine ---
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

  // --- Infinite Scroll Observer ---
  const lastVerticalElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "600px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore, activeTab]);

  // --- Click Handlers ---
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

  if (!isRestored) return <div className="min-h-screen bg-black" />;

  return (
    <main className="min-h-screen pb-32 bg-black text-white font-sans selection:bg-pink-500/30 overflow-x-hidden">
      
      {/* --- AMBIENT GLASS BACKGROUND (Hardware Accelerated, No Lag) --- */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden bg-black">
        {globalBgImage && (
           <div 
             className="absolute top-[-30%] left-[-30%] w-[160%] h-[160%] bg-cover bg-center opacity-[0.25] mix-blend-screen transform-gpu will-change-transform transition-opacity duration-1000 ease-in-out blur-[120px]"
             style={{ backgroundImage: `url(${getImageUrl(globalBgImage)})` }}
           />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/80 to-black backdrop-blur-[20px]" />
      </div>

      {/* --- UNIQUE FLOATING HEADER --- */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-3xl border-b border-white/5" />
        <div className="relative pt-10 pb-4 px-4 md:px-8 max-w-5xl mx-auto flex flex-col items-center">
          
          {/* Neon Search Pill */}
          <div className="relative w-full group">
            <div className="flex items-center w-full bg-white/5 group-hover:bg-white/10 focus-within:bg-white/10 border border-white/10 rounded-full h-[64px] px-6 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.05)] focus-within:shadow-[0_0_50px_rgba(255,255,255,0.1)] focus-within:border-white/30 backdrop-blur-xl">
              <SearchIcon size={24} className="text-white/40 flex-shrink-0" />
              <input 
                ref={inputRef}
                className="w-full h-full bg-transparent border-none outline-none text-[18px] md:text-[22px] font-bold text-white px-4 placeholder-white/30 tracking-wide"
                placeholder="Search artists, songs, podcasts..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} className="text-white/30 hover:text-white transition-colors p-2">
                  <X size={22} />
                </button>
              )}
            </div>

            {/* Floating Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[76px] left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl overflow-hidden z-[100] py-2 animate-in fade-in slide-in-from-top-4 duration-200">
                  {suggestions.map((s, i) => (
                     <div key={i} onClick={() => executeSearch(s.text)} className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <SearchIcon size={16} className="text-white/40" />
                        </div>
                        <span className="text-white/90 text-[16px] font-semibold tracking-wide truncate">
                          {s.runs ? s.runs.map((r: any, j: number) => <span key={j} className={r.bold ? "font-bold text-white drop-shadow-sm" : "opacity-60"}>{r.text}</span>) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* Premium Filter Tabs */}
          <div className="flex gap-2.5 mt-5 overflow-x-auto hide-scrollbar w-full pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all duration-300 whitespace-nowrap outline-none ${
                    isActive ? (tab.isPremium ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-105" : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105") 
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  {tab.icon && <tab.icon size={16} className={tab.isPremium && !isActive ? "text-pink-500" : ""} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- CONTENT LAYOUT --- */}
      <div className="relative z-10 pt-[220px] max-w-7xl mx-auto px-4 md:px-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-32 gap-4">
            <Loader2 className="animate-spin text-white/40" size={40} />
          </div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center mt-32 text-center animate-in fade-in duration-1000">
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-transparent tracking-tighter">
              Start Typing
            </h1>
          </div>
        ) : activeTab === "all" ? (
          
          <div className="flex flex-col lg:flex-row gap-10">
             {/* LEFT: Bento Hero & Songs */}
             <div className="w-full lg:w-[55%] flex flex-col gap-10">
                {allData.topMatches.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <TopHeroCard item={allData.topMatches[0]} onClick={handleItemClick} />
                  </div>
                )}
                
                {allData.songs.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <h2 className="text-2xl font-black text-white mb-5 tracking-tight">Top Tracks</h2>
                    <div className="flex flex-col gap-1 bg-white/[0.02] p-2 rounded-3xl border border-white/5">
                      {allData.songs.slice(0, 4).map((song: any, i: number) => (
                         <TrackRow key={i} item={song} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             {/* RIGHT: Floating Grids */}
             <div className="w-full lg:w-[45%] flex flex-col gap-10">
                {allData.albums.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <h2 className="text-2xl font-black text-white mb-5 tracking-tight">Albums</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {allData.albums.slice(0, 6).map((album: any, i: number) => (
                         <MediaGridCard key={i} item={album} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
                
                {allData.artists.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <h2 className="text-2xl font-black text-white mb-5 tracking-tight">Artists</h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {allData.artists.slice(0, 4).map((artist: any, i: number) => (
                         <MediaGridCard key={i} item={artist} onClick={handleItemClick} />
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

        ) : (
          
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            {activeTab === "songs" || activeTab === "pro" ? (
              <div className="flex flex-col gap-2 max-w-4xl mx-auto bg-white/[0.02] p-2 rounded-3xl border border-white/5">
                {results.map((item, i) => <TrackRow ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {results.map((item, i) => <MediaGridCard ref={i === results.length - 1 ? lastVerticalElementRef : null} key={i} item={item} onClick={handleItemClick} />)}
              </div>
            )}
            
            <div className="h-32 mt-8 flex justify-center items-center">
              {loadingMore && <Loader2 className="animate-spin text-white/40" size={32} />}
            </div>
          </div>

        )}
      </div>
    </main>
  );
}
