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

// --- ULTRA-PREMIUM ADAPTIVE COLOR CARD WITH STAGGERED ANIMATION ---
const SearchCard = forwardRef<HTMLDivElement, any>(({ item, tabType, onClick, isGrid = false, index = 0 }, ref) => {
  const type = item.type || tabType;
  const title = decodeEntities(item.title || item.name || item.song_name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";
  const imgUrl = getImageUrl(item.image);

  return (
    <div 
      ref={ref} 
      onClick={() => onClick(item, type)} 
      className={`search-card-stagger relative group cursor-pointer w-full flex-shrink-0 snap-start ${!isGrid ? "max-w-[140px] sm:max-w-[160px] md:max-w-[180px]" : ""}`}
      style={{ animationDelay: `${(index % 20) * 40}ms` }} // Staggered entrance
    >
      {/* Dynamic Ambient Card Glow */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center blur-[30px] opacity-0 group-hover:opacity-70 transition-opacity duration-700 rounded-3xl"
        style={{ backgroundImage: `url(${imgUrl})` }}
      />
      
      {/* Card Content Base */}
      <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-[20px] bg-white/5 backdrop-blur-2xl border border-white/10 group-hover:border-white/30 group-hover:bg-white/10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)]">
        <div className={`relative w-full aspect-square overflow-hidden shadow-inner ${isCircular ? "rounded-full" : "rounded-xl"}`}>
          <img 
            src={imgUrl} 
            alt={title} 
            loading="lazy" 
            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cubic-bezier(0.2,0.8,0.2,1)" 
          />
          {/* Blur Play Overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 transform scale-50 group-hover:scale-100 transition-transform duration-500 cubic-bezier(0.175,0.885,0.32,1.275)">
              <Play className="text-white fill-white ml-1" size={24} />
            </div>
          </div>
        </div>
        <div className="flex flex-col px-1 pb-1">
          <span className="text-[14px] sm:text-[15px] font-black text-white tracking-tight truncate drop-shadow-md">{title}</span>
          {subtitle && (
            <span className="text-[12px] sm:text-[13px] font-semibold text-white/50 truncate mt-0.5 group-hover:text-white/80 transition-colors">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
});
SearchCard.displayName = "SearchCard";

// --- RESPONSIVE HORIZONTAL CAROUSEL ---
const HorizontalCarousel = ({ title, type, items, hasMore, loadingMore, loadMore, onItemClick }: any) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) loadMore(type);
    }, { rootMargin: "400px", threshold: 0 });
    if (node) observerRef.current.observe(node);
  },[loadingMore, hasMore, loadMore, type]);

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
  },[type]);

  return (
    <div className="mb-8 sm:mb-12 contain-content relative animate-stagger-fade">
      <div className="flex items-center justify-between px-4 sm:px-8 mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white drop-shadow-lg">{title}</h2>
        <ChevronRight className="text-white/40 hover:text-white transition-colors cursor-pointer" size={28} />
      </div>
      <div id={`carousel-${type}`} onScroll={handleScroll} className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar px-4 sm:px-8 snap-x pb-8 pt-2">
        {items.map((item: any, i: number) => (
          <SearchCard ref={i === items.length - 1 ? lastElementRef : null} key={`${type}-${i}`} item={item} tabType={type} onClick={onItemClick} isGrid={false} index={i} />
        ))}
        {loadingMore && (
          <div className="flex-shrink-0 flex justify-center items-center w-[140px] sm:w-[160px] md:w-[180px] aspect-square rounded-[20px] bg-white/5 border border-white/10 backdrop-blur-xl animate-pulse">
            <Loader2 className="animate-spin text-white/50" size={32} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const CACHE_KEY = "search_page_cache_ultimate";
  const CACHE_DURATION_MS = 8 * 60 * 60 * 1000;

  const [isRestored, setIsRestored] = useState(false);
  const[query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const[activeTab, setActiveTab] = useState("all");

  const [allData, setAllData] = useState<any>({ topMatches:[], songs: [], albums:[], playlists: [], artists:[] });
  const[allPages, setAllPages] = useState<any>({ songs: 1, albums: 1, playlists: 1, artists: 1 });
  const [allHasMore, setAllHasMore] = useState<any>({ songs: true, albums: true, playlists: true, artists: true });
  const[horizontalLoading, setHorizontalLoading] = useState<any>({ songs: false, albums: false, playlists: false, artists: false });

  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const[loadingMore, setLoadingMore] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);

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

  // Dynamic Background Image Extractor
  const globalBgImage = allData?.topMatches?.[0]?.image || results?.[0]?.image || null;

  useEffect(() => { getAuthData(); },[]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 150) setShowNav(false);
      else setShowNav(true);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_DURATION_MS)) {
          const data = parsed.data;
          setQuery(data.query || ""); setDebouncedQuery(data.debouncedQuery || ""); 
          setActiveTab(data.activeTab || "all"); setAllData(data.allData || { topMatches: [], songs:[], albums: [], playlists:[], artists:[] });
          setAllPages(data.allPages || { songs: 1, albums: 1, playlists: 1, artists: 1 }); setAllHasMore(data.allHasMore || { songs: true, albums: true, playlists: true, artists: true });
          setResults(data.results ||[]); setPage(data.page || 1); setHasMore(data.hasMore ?? true);
          if (data.lastFetched) lastFetched.current = data.lastFetched;
        } else localStorage.removeItem(CACHE_KEY);
      } catch (e) {}
    }
    setIsRestored(true);
  },[]);

  useEffect(() => {
    if (!isRestored) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: { query, debouncedQuery, activeTab, allData, allPages, allHasMore, results, page, hasMore, lastFetched: lastFetched.current }
    }));
  },[query, debouncedQuery, activeTab, allData, allPages, allHasMore, results, page, hasMore, isRestored]);

  // Suggestion Engine (Only Fetch while typing, strictly clear when searching)
  useEffect(() => {
    if (!query.trim() || query === debouncedQuery) {
      setSuggestions([]); setShowSuggestions(false); return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://ayushser2.vercel.app/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        }
      } catch (e) {}
    };
    const sTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(sTimer);
  }, [query, debouncedQuery]);

  // ROCK-SOLID SEARCH TRIGGER (Removes Suggestions, Hides Keyboard)
  const executeSearch = (val: string) => {
    if (!val.trim()) return;
    setQuery(val);
    setDebouncedQuery(val);
    setSuggestions([]); // Nuke suggestions
    setShowSuggestions(false);
    inputRef.current?.blur(); // Force dismiss mobile keyboard
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch(query);
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
        if (!proData || !proData.StreamLinks || proData.StreamLinks.length === 0) throw new Error("Pro API returned empty.");

        const mappedDownloadUrl = proData.StreamLinks.map((l: any) => ({ quality: l.quality, url: l.url, link: l.url }));
        const songObj = {
          ...proData, id: proData.PermaUrl || item.id || Date.now().toString(),
          title: proData.Title || item.title, name: proData.Title || item.name,
          image: proData.Bannerlink || item.image, artists: proData.Artists || item.artist,
          primaryArtists: proData.Artists || item.artist, url: proData.PermaUrl || item.url,
          spotifyUrl: item.spotify_url || item.url, downloadUrl: mappedDownloadUrl, type: "song" 
        };
        setPlayContext({ type: "Search", name: "Pro Search" }); setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
      } catch (err) {
        try {
           const ytQuery = `${querySong} ${queryArtist.split(',').slice(0, 3).join(' ')} official music video`;
           const ytRes = await fetch(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(ytQuery)}`);
           const ytData = await ytRes.json();
           if (ytData?.top_result?.videoId) {
             const songObj = {
                id: item.id || Date.now().toString(), title: querySong, name: querySong, artists: queryArtist, primaryArtists: queryArtist, image: item.image, url: item.spotify_url || item.url, spotifyUrl: item.spotify_url || item.url, ytVideoId: ytData.top_result.videoId, isProFallback: true, type: "song"
             };
             setPlayContext({ type: "Search", name: "Pro Search (Video)" }); setQueue([songObj]); setCurrentSong(songObj); setIsPlaying(true);
           }
        } catch (fallbackErr) {}
      }
      return;
    }

    let link = item.url || item.perma_url || item.action || "";
    if (link && !link.startsWith("http")) link = `https://www.jiosaavn.com${link}`;
    let path = link; try { path = new URL(link).pathname; } catch (e) { path = link.replace("https://www.jiosaavn.com", ""); }

    if (type === "songs" || type === "song") { setPlayContext({ type: "Search", name: "Search Results" }); setQueue([item]); setCurrentSong(item); setIsPlaying(true); }
    else if (type === "albums" || type === "album") router.push(path);
    else if (type === "playlists" || type === "playlist") router.push(path);
    else if (type === "artists" || type === "artist") router.push(`/artist?id=${item.id}`);
  };

  if (!isRestored) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <main className="min-h-screen pb-36 relative bg-[#050505] text-white selection:bg-fuchsia-500/30 overflow-x-hidden">
      
      {/* GLOBAL CUSTOM KEYFRAMES & CSS HACKS FOR FLUID ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes customFadeInUp {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .search-card-stagger {
          animation: customFadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-stagger-fade {
          animation: customFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* DYNAMIC AMBIENT FULL-SCREEN BACKGROUND */}
      <div className="fixed inset-0 z-[0] pointer-events-none transition-all duration-[2000ms] ease-in-out bg-[#050505]">
        {globalBgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen transition-all duration-[2000ms] ease-in-out"
            style={{ backgroundImage: `url(${getImageUrl(globalBgImage)})`, filter: 'blur(100px) saturate(250%)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505] backdrop-blur-[40px]" />
      </div>

      {/* FLOATING, RESPONSIVE HIDE-ON-SCROLL HEADER */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="absolute inset-0 bg-[#050505]/50 backdrop-blur-3xl border-b border-white/5 shadow-2xl" />
        <div className="relative pt-6 sm:pt-10 pb-4 px-4 sm:px-8 max-w-[1800px] mx-auto">
          
          <div className="relative max-w-4xl">
            <div className={`relative flex items-center w-full h-14 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/[0.04] backdrop-blur-2xl border transition-all duration-300 shadow-2xl ${isListening ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-white/10 focus-within:border-white/30 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_50px_rgba(255,255,255,0.06)]'}`}>
              <div className="grid place-items-center h-full w-14 sm:w-16 text-white/40">
                {loading ? <Loader2 className="animate-spin text-white" size={22} /> : <SearchIcon size={22} className={query ? "text-white drop-shadow-md" : ""} />}
              </div>
              
              <input 
                ref={inputRef}
                className="peer h-full w-full outline-none text-[16px] sm:text-[18px] text-white bg-transparent placeholder-white/30 font-semibold tracking-wide" 
                type="text" 
                placeholder="Search songs, artists, albums..." 
                value={query} 
                onChange={(e) => { setQuery(e.target.value); if(!e.target.value.trim()){ setSuggestions([]); setShowSuggestions(false); } }}
                onKeyDown={handleKeyDown}
              />
              
              {query && (
                <button onClick={() => { setQuery(""); setDebouncedQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }} className="p-2 sm:p-3 text-white/30 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}

              <div className="w-px h-6 sm:h-8 bg-white/10 mx-1 sm:mx-2" />

              <button onClick={() => {/* Voice handling skipped for brevity */}} className={`mr-2 sm:mr-3 p-2.5 sm:p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}>
                <Mic size={20} />
              </button>
            </div>

            {/* SUGGESTIONS PANEL */}
            {showSuggestions && suggestions.length > 0 && (
               <div className="absolute top-[70px] sm:top-20 left-0 right-0 bg-[#121212]/90 backdrop-blur-3xl border border-white/10 rounded-[20px] sm:rounded-[24px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden z-[100] transform transition-all duration-300 origin-top">
                  {suggestions.map((s, i) => (
                     <div 
                       key={i} 
                       onClick={() => executeSearch(s.text)} 
                       className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors active:bg-white/20 group"
                     >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                          <SearchIcon size={16} className="text-white/40 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-white/90 text-[15px] sm:text-[17px] font-medium tracking-wide truncate">
                          {s.runs ? s.runs.map((r: any, j: number) => (
                             <span key={j} className={r.bold ? "font-bold text-white drop-shadow-sm" : "opacity-60"}>{r.text}</span>
                          )) : s.text}
                        </span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 overflow-x-auto hide-scrollbar pb-2 pt-1 max-w-4xl">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isPro = tab.isPremium;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setPage(1); }} 
                  className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-[13px] sm:text-[15px] font-bold transition-all duration-300 whitespace-nowrap outline-none ${
                    isActive && !isPro ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-105" 
                    : isActive && isPro ? "bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] scale-105"
                    : isPro ? "bg-white/5 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 border border-white/10 hover:bg-white/10 active:scale-95"
                    : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 active:scale-95"
                  }`}
                >
                  {tab.icon && <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isPro && !isActive ? "text-pink-500" : ""} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 pt-48 sm:pt-56 max-w-[1800px] mx-auto pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 sm:mt-32 gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-white/10 border-t-white rounded-full animate-spin shadow-[0_0_50px_rgba(255,255,255,0.3)]" />
          </div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center mt-10 sm:mt-20 px-6 text-center animate-stagger-fade">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-6 sm:mb-8">
               <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600 to-cyan-500 rounded-full blur-[70px] opacity-20 animate-pulse duration-[5000ms]" />
               <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[30px] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl flex items-center justify-center">
                  <Sparkles size={32} className="text-white opacity-90 sm:w-10 sm:h-10" />
               </div>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter drop-shadow-lg mb-3 sm:mb-4">
              Explore the Universe
            </h1>
            <p className="text-white/40 font-semibold text-base sm:text-xl max-w-md">
              Search for artists, albums, or your favorite songs to begin.
            </p>
          </div>
        ) : activeTab === "all" ? (
          <div className="flex flex-col gap-8 sm:gap-12">
            {allData.topMatches.length > 0 && (
              <div className="mb-2 contain-content animate-stagger-fade">
                <div className="flex items-center gap-3 px-4 sm:px-8 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                    <Flame className="text-white" size={20} />
                  </div>
                  <h2 className="text-[24px] sm:text-[30px] font-black tracking-tighter text-white drop-shadow-md">Top Results</h2>
                </div>
                <div className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar px-4 sm:px-8 snap-x pb-6">
                  {allData.topMatches.map((item: any, i: number) => <SearchCard key={`top-${i}`} item={item} onClick={handleItemClick} isGrid={false} index={i} />)}
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
          <div className="px-4 sm:px-8">
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6 justify-items-center">
              {results.map((item, index) => <SearchCard ref={index === results.length - 1 ? lastVerticalElementRef : null} key={`${activeTab}-${index}`} item={item} tabType={activeTab} onClick={handleItemClick} isGrid={true} index={index} />)}
            </div>
            <div className="h-32 mt-10 flex justify-center items-center w-full">
              {loadingMore && <Loader2 className="animate-spin text-white/50" size={32} />}
              {!hasMore && results.length > 0 && (
                <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                  <p className="text-[13px] sm:text-[14px] text-white/40 font-bold tracking-widest uppercase">End of results</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
