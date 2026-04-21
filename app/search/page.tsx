"use client";
import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { 
  Search as SearchIcon, Loader2, Music2, Disc, ListMusic, 
  Mic2, X, Mic, Play, Sparkles, Flame 
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
    } catch (error) {
      console.error("Auth Failed:", error);
      return null;
    } finally {
      ongoingAuthPromise = null;
    }
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

const decodeEntities = (text: any) => {
  if (!text) return "";
  return String(text).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

const getSubtitle = (item: any, type: string) => {
  if (type === "pro") return item.artist || item.artists || "Pro Track";
  if (type === "songs" || item.type === "song") {
    if (item.artists?.primary && Array.isArray(item.artists.primary)) return item.artists.primary.map((a: any) => a.name).join(", ");
    if (typeof item.artists === "string") return item.artists;
    if (item.primaryArtists) return item.primaryArtists;
    if (item.singers) return item.singers;
    if (item.more_info?.artistMap?.primary_artists?.length > 0) return item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    return "Song";
  }
  if (type === "albums" || item.type === "album") return item.artist || (item.year ? `Album • ${item.year}` : "Album");
  if (type === "playlists" || item.type === "playlist") return item.language ? `${item.language} Playlist` : "Playlist";
  if (type === "artists" || item.type === "artist") return "Artist";
  return item.subtitle || item.description || "";
};

const getMatchScore = (title: string, query: string) => {
  if (!title || !query) return 0;
  const t = title.toLowerCase(); const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 10;
  return 0;
};

// --- REDESIGNED PRO SEARCH CARD ---
const SearchCard = forwardRef<HTMLDivElement, any>(({ item, tabType, onClick, isGrid = false }, ref) => {
  const type = item.type || tabType;
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div 
      ref={ref} 
      onClick={() => onClick(item, type)} 
      className={`group cursor-pointer flex flex-col gap-3 p-3 rounded-2xl hover:bg-white/10 active:bg-white/5 transition-colors duration-300 ${isGrid ? "w-full" : "w-40 flex-shrink-0 snap-start"}`}
    >
      <div className={`relative w-full aspect-square overflow-hidden shadow-lg border border-white/5 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 ${isCircular ? "rounded-full" : "rounded-xl"}`}>
        <img 
          src={getImageUrl(item.image)} 
          alt={title} 
          loading="lazy" 
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
        />
        {/* Colorful Hover Overlay & Play Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.5)] transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <Play className="text-white fill-white ml-1" size={20} />
          </div>
        </div>
      </div>
      <div className="flex flex-col px-1">
        <span className="text-[15px] font-bold text-white tracking-wide truncate">{title}</span>
        {subtitle && (
          <span className="text-[13px] font-medium text-white/50 truncate mt-0.5 group-hover:text-white/80 transition-colors">{subtitle}</span>
        )}
      </div>
    </div>
  );
});
SearchCard.displayName = "SearchCard";

// --- REDESIGNED HORIZONTAL CAROUSEL ---
const HorizontalCarousel = ({ title, type, items, hasMore, loadingMore, loadMore, onItemClick }: any) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) loadMore(type);
    }, { rootMargin: "400px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, loadMore, type]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrolls = JSON.parse(sessionStorage.getItem("search_scrollX") || "{}");
    scrolls[type] = (e.target as HTMLDivElement).scrollLeft;
    sessionStorage.setItem("search_scrollX", JSON.stringify(scrolls));
  };

  useEffect(() => {
    const scrolls = JSON.parse(sessionStorage.getItem("search_scrollX") || "{}");
    if (scrolls[type]) {
      const restoreScroll = () => { const el = document.getElementById(`carousel-${type}`); if (el) el.scrollLeft = scrolls[type]; };
      restoreScroll(); requestAnimationFrame(restoreScroll); setTimeout(restoreScroll, 100);
    }
  }, [type]);

  return (
    <div className="mb-8 contain-content">
      <div className="flex items-center gap-2 px-6 mb-3">
        <h2 className="text-[22px] font-black tracking-tight text-white">{title}</h2>
      </div>
      <div id={`carousel-${type}`} onScroll={handleScroll} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <SearchCard ref={i === items.length - 1 ? lastElementRef : null} key={`${type}-${i}`} item={item} tabType={type} onClick={onItemClick} isGrid={false} />
        ))}
        {loadingMore && (
          <div className="flex-shrink-0 flex justify-center items-center w-40 aspect-square rounded-xl bg-white/5 animate-pulse">
            <Loader2 className="animate-spin text-emerald-400" size={32} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const router = useRouter();
  const CACHE_KEY = "search_page_cache_ultimate";
  const CACHE_DURATION_MS = 8 * 60 * 60 * 1000;

  const [isRestored, setIsRestored] = useState(false);
  const [query, setQuery] = useState("");
  const[debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [allData, setAllData] = useState<any>({ topMatches: [], songs: [], albums:[], playlists: [], artists:[] });
  const [allPages, setAllPages] = useState<any>({ songs: 1, albums: 1, playlists: 1, artists: 1 });
  const[allHasMore, setAllHasMore] = useState<any>({ songs: true, albums: true, playlists: true, artists: true });
  const [horizontalLoading, setHorizontalLoading] = useState<any>({ songs: false, albums: false, playlists: false, artists: false });

  const[results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const lastFetched = useRef({ query: "", tab: "all", page: 1 });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All" },
    { id: "pro", label: "Pro", icon: Flame }, 
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  useEffect(() => { getAuthData(); },[]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (parsed.timestamp && (now - parsed.timestamp < CACHE_DURATION_MS)) {
          const data = parsed.data;
          setQuery(data.query || ""); 
          setDebouncedQuery(data.debouncedQuery || ""); 
          setActiveTab(data.activeTab || "all");
          setAllData(data.allData || { topMatches: [], songs:[], albums: [], playlists:[], artists:[] });
          setAllPages(data.allPages || { songs: 1, albums: 1, playlists: 1, artists: 1 });
          setAllHasMore(data.allHasMore || { songs: true, albums: true, playlists: true, artists: true });
          setResults(data.results ||[]); 
          setPage(data.page || 1); 
          setHasMore(data.hasMore ?? true);
          if (data.lastFetched) lastFetched.current = data.lastFetched;
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      } catch (e) {}
    }
    setIsRestored(true);
  },[]);

  useEffect(() => {
    if (!isRestored) return;
    const stateToCache = {
      timestamp: Date.now(),
      data: { query, debouncedQuery, activeTab, allData, allPages, allHasMore, results, page, hasMore, lastFetched: lastFetched.current }
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
  },[query, debouncedQuery, activeTab, allData, allPages, allHasMore, results, page, hasMore, isRestored]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (query === debouncedQuery) return;
    
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://ayushser2.vercel.app/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.error("Suggestion error:", e);
      }
    };

    const sTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(sTimer);
  }, [query, debouncedQuery]);

  useEffect(() => {
    if (!isRestored) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setShowSuggestions(false);
    }, 600);
    return () => clearTimeout(timer);
  },[query, isRestored]);

  // Trigger search on "Enter"
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedQuery(query);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    if (!isRestored) return;
    if (!debouncedQuery.trim()) {
      setAllData({ topMatches: [], songs:[], albums: [], playlists: [], artists:[] });
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
            .filter(match => match.score > 0).sort((a, b) => b.score - a.score).map(match => match.item).slice(0, 8);

          setAllData({ topMatches: sortedMatches.length > 0 ? sortedMatches : combined.slice(0, 8), songs: sJson.data?.results || sJson.data ||[], albums: aJson.data?.results || aJson.data ||[], playlists: pJson.data?.results || pJson.data ||[], artists: arJson.data?.results || arJson.data ||[] });
          setAllPages({ songs: 1, albums: 1, playlists: 1, artists: 1 }); setAllHasMore({ songs: true, albums: true, playlists: true, artists: true }); setHasMore(false);
        } else if (activeTab === "pro") {
          const auth = await getAuthData();
          if (auth && auth.accessToken) {
            const offset = (page - 1) * 20;
            const res = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(debouncedQuery)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=20&offset=${offset}`);
            if (!res.ok) throw new Error("Pro Search API failed");
            const data = await res.json();
            const rawResults = Array.isArray(data) ? data : (data.results ||[]);

            const newData = rawResults.map((item: any) => ({
              ...item, type: "pro", id: item.spotify_url || Date.now().toString(),
              title: item.song_name || "Unknown Track", name: item.song_name || "Unknown Track",
              artist: item.artist || "Unknown Artist", image: item.image || "https://via.placeholder.com/500x500?text=Pro",
              url: item.spotify_url || ""
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
      } catch (err) { console.error("Search fetch error:", err); } finally { setLoading(false); setLoadingMore(false); }
    };
    fetchData();
  },[debouncedQuery, activeTab, page, isRestored]);

  const handleVoiceSearch = () => {
    const windowAny = window as any;
    const SpeechRecognition = windowAny.SpeechRecognition || windowAny.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setDebouncedQuery(transcript);
      setShowSuggestions(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    setDebouncedQuery(text); // Instantly trigger search
    setShowSuggestions(false);
  };

  const loadMoreHorizontal = useCallback(async (type: string) => {
    if (horizontalLoading[type] || !allHasMore[type]) return;
    setHorizontalLoading((prev: any) => ({ ...prev,[type]: true }));
    try {
      const nextPage = allPages[type] + 1;
      const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${type}?query=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`);
      const json = await res.json();
      const newData = json.data?.results || json.data ||[];
      if (newData.length === 0) setAllHasMore((prev: any) => ({ ...prev,[type]: false }));
      else { setAllData((prev: any) => ({ ...prev,[type]: [...prev[type], ...newData] })); setAllPages((prev: any) => ({ ...prev, [type]: nextPage })); }
    } catch (e) {}
    setHorizontalLoading((prev: any) => ({ ...prev, [type]: false }));
  },[debouncedQuery, allPages, allHasMore, horizontalLoading]);

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
        const proApiUrl = `https://serverayush.vercel.app/api/search?q=${encodeURIComponent(querySong)}&artist=${encodeURIComponent(queryArtist)}`;
        const res = await fetch(proApiUrl);
        if (!res.ok) throw new Error("Failed to fetch stream links");
        const proData = await res.json();

        if (!proData || !proData.StreamLinks || proData.StreamLinks.length === 0) {
           throw new Error("Pro API returned empty or invalid stream data.");
        }

        const mappedDownloadUrl = proData.StreamLinks.map((l: any) => ({ quality: l.quality, url: l.url, link: l.url }));
        const songObj = {
          ...proData, id: proData.PermaUrl || item.id || Date.now().toString(),
          title: proData.Title || item.title, name: proData.Title || item.name,
          image: proData.Bannerlink || item.image, artists: proData.Artists || item.artist,
          primaryArtists: proData.Artists || item.artist, url: proData.PermaUrl || item.url,
          spotifyUrl: item.spotify_url || item.url, downloadUrl: mappedDownloadUrl, type: "song" 
        };
        setPlayContext({ type: "Search", name: "Pro Search Results" });
        setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
      } catch (err) {
        console.warn("Saavn fallback triggered for Pro Search:", err);
        try {
           const ytQuery = `${querySong} ${queryArtist.split(',').slice(0, 3).join(' ')} official music video`;
           const ytRes = await fetch(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(ytQuery)}`);
           const ytData = await ytRes.json();
           
           if (ytData?.top_result?.videoId) {
             const songObj = {
                id: item.id || Date.now().toString(), title: querySong, name: querySong,
                artists: queryArtist, primaryArtists: queryArtist, image: item.image,
                url: item.spotify_url || item.url, spotifyUrl: item.spotify_url || item.url, 
                ytVideoId: ytData.top_result.videoId, isProFallback: true, type: "song"
             };
             setPlayContext({ type: "Search", name: "Pro Search (Video Mode)" });
             setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
           }
        } catch (fallbackErr) {
           console.error("Fallback video fetch failed:", fallbackErr);
        }
      }
      return;
    }

    let link = item.url || item.perma_url || item.action || "";
    if (link && !link.startsWith("http")) link = `https://www.jiosaavn.com${link}`;
    let path = link;
    try { path = new URL(link).pathname; } catch (e) { path = link.replace("https://www.jiosaavn.com", ""); }

    if (type === "songs" || type === "song") {
      setPlayContext({ type: "Search", name: "Search Results" });
      setQueue([item]); setCurrentSong(item); setIsPlaying(true);
    } else if (type === "albums" || type === "album") router.push(path);
    else if (type === "playlists" || type === "playlist") router.push(path);
    else if (type === "artists" || type === "artist") router.push(`/artist?id=${item.id}`);
  };

  if (!isRestored) return <div className="min-h-screen bg-[#09090b]" />;

  return (
    <main className="min-h-screen pb-32 relative isolate bg-[#09090b] text-white">
      {/* VIBRANT DYNAMIC BACKGROUND ENGINE */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-900/20 blur-[140px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
        <div className="absolute top-[20%] right-[-15%] w-[60vw] h-[60vw] bg-violet-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] bg-cyan-900/15 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]" />
      </div>

      {/* REDESIGNED STICKY HEADER & SEARCH BAR */}
      <div className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-2xl pt-8 pb-4 px-6 border-b border-white/5 shadow-2xl">
        <div className="relative max-w-4xl mx-auto">
          <div className={`relative flex items-center w-full h-16 rounded-2xl bg-white/5 border transition-all duration-300 shadow-inner ${isListening ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 focus-within:border-emerald-500/50 focus-within:bg-white/10 focus-within:shadow-[0_0_30px_rgba(52,211,153,0.15)]'}`}>
            <div className="grid place-items-center h-full w-16 text-white/50">
              {loading ? <Loader2 className="animate-spin text-emerald-400" size={22} /> : <SearchIcon size={22} className={query ? "text-emerald-400" : ""} />}
            </div>
            
            <input 
              className="peer h-full w-full outline-none text-[18px] text-white bg-transparent placeholder-white/40 font-semibold tracking-wide" 
              type="text" 
              placeholder="What do you want to listen to?" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
            />
            
            {query && (
              <button onClick={() => { setQuery(""); setSuggestions([]); setShowSuggestions(false); }} className="p-3 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            )}

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button onClick={handleVoiceSearch} className={`mr-3 p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
              <Mic size={22} />
            </button>
          </div>

          {/* COLORFUL SUGGESTIONS DROPDOWN */}
          {showSuggestions && suggestions.length > 0 && (
             <div className="absolute top-20 left-0 right-0 bg-[#18181b]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
                {suggestions.map((s, i) => (
                   <div 
                     key={i} 
                     onClick={() => handleSuggestionClick(s.text)} 
                     className="px-6 py-4 border-b border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors active:bg-white/20 group"
                   >
                      <SearchIcon size={18} className="text-white/30 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                      <span className="text-white/90 text-[16px] font-medium tracking-wide truncate">
                        {s.runs ? s.runs.map((r: any, j: number) => (
                           <span key={j} className={r.bold ? "font-bold text-white" : "opacity-70"}>{r.text}</span>
                        )) : s.text}
                      </span>
                   </div>
                ))}
             </div>
          )}
        </div>

        {/* VIBRANT PILL TABS */}
        <div className="flex gap-3 mt-6 overflow-x-auto hide-scrollbar pb-2 px-1 max-w-4xl mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all duration-300 whitespace-nowrap ${
                  isActive 
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-105" 
                  : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
                }`}
              >
                {tab.icon && <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2} />}{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-32 gap-4">
            <Loader2 className="animate-spin text-emerald-400" size={48} />
            <p className="text-white/50 font-medium">Searching the universe...</p>
          </div>
        ) : !debouncedQuery.trim() ? (
          // COLORFUL EMPTY STATE
          <div className="flex flex-col items-center justify-center mt-32 animate-in fade-in duration-700 px-6 text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(52,211,153,0.15)] relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full blur-xl opacity-20 animate-pulse" />
               <Sparkles size={48} className="text-emerald-400 relative z-10" />
            </div>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 tracking-tight">Discover New Music</p>
            <p className="text-white/50 font-medium mt-3 text-lg">Search for your favorite tracks, artists, or podcasts</p>
          </div>
        ) : activeTab === "all" ? (
          <div className="flex flex-col gap-6">
            {allData.topMatches.length > 0 && (
              <div className="mb-4 contain-content">
                <div className="flex items-center gap-2 px-6 mb-4">
                  <Flame className="text-emerald-400" size={24} />
                  <h2 className="text-[24px] font-black tracking-tight text-white">Top Results</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 snap-x pb-4">
                  {allData.topMatches.map((item: any, i: number) => <SearchCard key={`top-${i}`} item={item} onClick={handleItemClick} isGrid={false} />)}
                </div>
              </div>
            )}
            {[
              { title: "Songs", data: allData.songs, type: "songs" }, { title: "Albums", data: allData.albums, type: "albums" },
              { title: "Artists", data: allData.artists, type: "artists" }, { title: "Playlists", data: allData.playlists, type: "playlists" },
            ].map((section, idx) => section.data.length > 0 && (
              <HorizontalCarousel key={idx} title={section.title} type={section.type} items={section.data} hasMore={allHasMore[section.type]} loadingMore={horizontalLoading[section.type]} loadMore={loadMoreHorizontal} onItemClick={handleItemClick} />
            ))}
          </div>
        ) : (
          <div className="px-6">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-8 justify-items-center">
              {results.map((item, index) => <SearchCard ref={index === results.length - 1 ? lastVerticalElementRef : null} key={`${activeTab}-${index}`} item={item} tabType={activeTab} onClick={handleItemClick} isGrid={true} />)}
            </div>
            <div className="h-24 mt-8 flex justify-center items-center w-full">
              {loadingMore && <Loader2 className="animate-spin text-emerald-400" size={32} />}
              {!hasMore && results.length > 0 && <p className="text-[15px] text-white/30 font-semibold tracking-wide">You've reached the end</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
