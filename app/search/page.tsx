"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search as SearchIcon, Loader2, Music2, Disc, ListMusic, Mic2, X } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// Safe Image Extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500"); 
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

// HTML Entity Decoder
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

// Subtitle Extractor
const getSubtitle = (item: any, type: string) => {
  if (type === "songs" || item.type === "song") {
    if (item.artists?.primary && Array.isArray(item.artists.primary)) {
      return item.artists.primary.map((a: any) => a.name).join(", ");
    }
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

// Smart Scoring Engine for Best Matches
const getMatchScore = (title: string, query: string) => {
  if (!title || !query) return 0;
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 10;
  return 0;
};

// Premium Card Component (Identical to Home Page Marquee & Styling)
const SearchCard = ({ item, tabType, onClick, isGrid = false }: any) => {
  const type = item.type || tabType;
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  const isLongTitle = title.length > 15;
  const isLongSub = subtitle.length > 18;

  const titleSpeed = `${Math.max(4, title.length * 0.25)}s`;
  const subSpeed = `${Math.max(4, subtitle.length * 0.25)}s`;

  return (
    <div 
      onClick={() => onClick(item, type)} 
      className={`cursor-pointer group active:scale-95 transition-transform duration-200 ${isGrid ? "w-full" : "flex-shrink-0 snap-start w-36"}`}
    >
      <div className={`relative overflow-hidden shadow-md bg-white/5 border border-white/5 mb-2 flex items-center justify-center ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        <img 
          src={getImageUrl(item.image)} 
          alt={title} 
          loading="lazy" 
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
        />
      </div>
      
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span
          className={`inline-block text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`}
          style={isLongTitle ? { animationDuration: titleSpeed } : {}}
        >
          {title}
        </span>
      </div>

      {subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
          <span
            className={`inline-block text-[12px] font-medium text-neutral-400 capitalize ${isLongSub ? "animate-ping-pong" : ""}`}
            style={isLongSub ? { animationDuration: subSpeed } : {}}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const router = useRouter();

  const CACHE_KEY = "search_page_cache_v1";

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [allData, setAllData] = useState<any>({ topMatches:[], songs: [], albums: [], playlists:[], artists:[] });
  
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const[hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const[lastFetched, setLastFetched] = useState({ query: "", tab: "all", page: 1 });
  const[isRestored, setIsRestored] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All" }, 
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  // Restore State from Session Storage (Fixes the "Blank on Back" issue)
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setQuery(parsed.query || "");
        setDebouncedQuery(parsed.debouncedQuery || "");
        setActiveTab(parsed.activeTab || "all");
        setAllData(parsed.allData || { topMatches: [], songs: [], albums:[], playlists: [], artists: [] });
        setResults(parsed.results ||[]);
        setPage(parsed.page || 1);
        setHasMore(parsed.hasMore ?? true);
        setLastFetched(parsed.lastFetched || { query: "", tab: "all", page: 1 });
      } catch(e) {}
    }
    setIsRestored(true);
  },[]);

  // Save State to Session Storage whenever important variables change
  useEffect(() => {
    if (!isRestored) return;
    const stateToCache = { query, debouncedQuery, activeTab, allData, results, page, hasMore, lastFetched };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
  },[query, debouncedQuery, activeTab, allData, results, page, hasMore, lastFetched, isRestored]);

  // Debounce input
  useEffect(() => {
    if (!isRestored) return;
    const timer = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(timer);
  }, [query, isRestored]);

  // Main Fetch Logic
  useEffect(() => {
    if (!isRestored) return;

    if (!debouncedQuery.trim()) {
      setAllData({ topMatches: [], songs: [], albums: [], playlists: [], artists:[] });
      setResults([]);
      setHasMore(true);
      setLastFetched({ query: "", tab: activeTab, page: 1 });
      return;
    }

    const isNewQueryOrTab = debouncedQuery !== lastFetched.query || activeTab !== lastFetched.tab;
    
    // Ensure page resets to 1 before fetching new queries
    if (isNewQueryOrTab && page !== 1) {
      setPage(1);
      setHasMore(true);
      return; 
    }

    // Skip if we already successfully fetched this exact combination (Resuming from Back navigation)
    if (!isNewQueryOrTab && page === lastFetched.page) {
      return;
    }

    const fetchData = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        if (activeTab === "all") {
          const[sRes, aRes, pRes, arRes] = await Promise.all([
            fetch(`https://ayushm-psi.vercel.app/api/search/songs?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/albums?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/playlists?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/artists?query=${encodeURIComponent(debouncedQuery)}&page=1`)
          ]);

          const[sJson, aJson, pJson, arJson] = await Promise.all([sRes.json(), aRes.json(), pRes.json(), arRes.json()]);

          const songs = sJson.data?.results || sJson.data ||[];
          const albums = aJson.data?.results || aJson.data ||[];
          const playlists = pJson.data?.results || pJson.data ||[];
          const artists = arJson.data?.results || arJson.data || [];

          const combined =[
            ...songs.map((i: any) => ({ ...i, type: "song" })),
            ...albums.map((i: any) => ({ ...i, type: "album" })),
            ...playlists.map((i: any) => ({ ...i, type: "playlist" })),
            ...artists.map((i: any) => ({ ...i, type: "artist" }))
          ];

          const sortedMatches = combined
            .map(item => ({ item, score: getMatchScore(item.title || item.name, debouncedQuery) }))
            .filter(match => match.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(match => match.item)
            .slice(0, 10);

          const topMatches = sortedMatches.length > 0 ? sortedMatches : combined.slice(0, 10);

          setAllData({ 
            topMatches, 
            songs: songs.slice(0, 20), 
            albums: albums.slice(0, 20), 
            playlists: playlists.slice(0, 20), 
            artists: artists.slice(0, 20) 
          });
          setHasMore(false); 
        } else {
          const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${activeTab}?query=${encodeURIComponent(debouncedQuery)}&page=${page}`);
          const json = await res.json();
          const newData = json.data?.results || json.data ||[];

          setResults(prev => (isNewQueryOrTab || page === 1) ? newData : [...prev, ...newData]);
          if (newData.length === 0) setHasMore(false);
        }
        
        setLastFetched({ query: debouncedQuery, tab: activeTab, page });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchData();
  }, [debouncedQuery, activeTab, page, isRestored]);

  // Infinite Scroll Hook for Dedicated Tabs
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, activeTab]);

  // Handle Clicks
  const handleItemClick = (item: any, passedType?: string) => {
    const type = item.type || passedType || activeTab;
    let link = item.url || item.perma_url || item.action || "";
    if (link && !link.startsWith("http")) link = `https://www.jiosaavn.com${link}`;
    
    if (type === "songs" || type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (type === "albums" || type === "album") {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (type === "playlists" || type === "playlist") {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (type === "artists" || type === "artist") {
      router.push(`/artist?id=${item.id}`);
    }
  };

  return (
    <main className="min-h-screen pt-12 pb-28 bg-[#121212]">
      <div className="px-4 mb-4">
        <h1 className="text-3xl font-black tracking-tighter text-white">Search</h1>
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur-2xl pt-2 pb-3 px-4 border-b border-white/5">
        <div className="relative flex items-center w-full h-12 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/30 shadow-lg transition-colors">
          <div className="grid place-items-center h-full w-12 text-neutral-400">
            <SearchIcon size={18} />
          </div>
          <input
            className="peer h-full w-full outline-none text-[15px] text-white bg-transparent pr-10 placeholder-neutral-500 font-medium tracking-wide"
            type="text"
            placeholder="Songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 text-neutral-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all whitespace-nowrap ${
                  isActive ? "bg-white text-black scale-105" : "bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10 active:scale-95"
                }`}
              >
                {tab.icon && <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-neutral-400" size={32} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center mt-24 text-neutral-600 animate-slide-down">
            <SearchIcon size={56} className="mb-4 opacity-20" />
            <p className="text-lg font-bold text-neutral-400 tracking-tight">Find your music</p>
          </div>
        ) : activeTab === "all" ? (
          <div className="flex flex-col gap-2">
            
            {/* Best Matches - Single Line Horizontal */}
            {allData.topMatches.length > 0 && (
              <div className="mb-6 contain-content">
                <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">Best Matches</h2>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
                  {allData.topMatches.map((item: any, i: number) => (
                    <SearchCard key={`top-${i}`} item={item} onClick={handleItemClick} isGrid={false} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Standard Carousels for everything else on the "All" tab */}
            {[
              { title: "Songs", data: allData.songs, type: "songs" },
              { title: "Albums", data: allData.albums, type: "albums" },
              { title: "Artists", data: allData.artists, type: "artists" },
              { title: "Playlists", data: allData.playlists, type: "playlists" },
            ].map((section, idx) => section.data.length > 0 && (
              <div key={idx} className="mb-6 contain-content">
                <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{section.title}</h2>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
                  {section.data.map((item: any, i: number) => (
                    <SearchCard key={`${section.type}-${i}`} item={item} tabType={section.type} onClick={handleItemClick} isGrid={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4">
            {/* Dedicated Tabs - 3 Column Grid with Infinite Scroll */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-4">
              {results.map((item, index) => (
                <SearchCard key={index} item={item} tabType={activeTab} onClick={handleItemClick} isGrid={true} />
              ))}
            </div>
            
            <div ref={lastElementRef} className="h-10 mt-8 mb-6 flex justify-center items-center w-full">
              {loadingMore && <Loader2 className="animate-spin text-neutral-500" size={24} />}
              {!hasMore && results.length > 0 && <p className="text-sm text-neutral-600 font-medium">End of results</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
