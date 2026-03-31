"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search as SearchIcon, Loader2, Music2, Disc, ListMusic, Mic2, X, Sparkles } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// Safe Image Extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/150x150?text=Music";
  if (typeof img === "string") return img.replace("50x50", "150x150"); // 150 is perfect for 4-grid
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/150x150?text=Music";
};

// HTML Entity Decoder
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

// Subtitle Extractor - Strictly Artist Name for Songs
const getSubtitle = (item: any, type: string) => {
  if (type === "songs" || item.type === "song") {
    // Extract artist name directly for songs
    if (item.primaryArtists) return item.primaryArtists;
    if (item.singers) return item.singers;
    if (item.more_info?.artistMap?.primary_artists?.length > 0) return item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    return "Song";
  }
  if (type === "albums" || item.type === "album") return item.artist || item.year ? `Album • ${item.year}` : "Album";
  if (type === "playlists" || item.type === "playlist") return item.language ? `${item.language} Playlist` : "Playlist";
  if (type === "artists" || item.type === "artist") return "Artist";
  return item.subtitle || item.description || "";
};

// Smart Scoring Engine for Best Matches
const getMatchScore = (title: string, query: string) => {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100; // Exact match
  if (t.startsWith(q)) return 50; // Starts with
  if (t.includes(q)) return 10; // Contains
  return 0; // No match
};

// Premium 4-Grid Card Component
const SearchCard = ({ item, tabType, index, onClick }: any) => {
  const type = item.type || tabType;
  const title = decodeEntities(item.title || item.name);
  const subtitle = decodeEntities(getSubtitle(item, type));
  const isCircular = type === "artists" || type === "artist";

  return (
    <div 
      onClick={() => onClick(item, type)} 
      className="animate-slide-down flex flex-col items-center cursor-pointer group active:scale-95 transition-transform duration-200"
      style={{ animationDelay: `${(index % 12) * 0.03}s` }}
    >
      <div className={`w-full aspect-square overflow-hidden shadow-md bg-neutral-900 border border-white/5 mb-1.5 flex items-center justify-center ${isCircular ? "rounded-full" : "rounded-xl"}`}>
        <img 
          src={getImageUrl(item.image)} 
          alt={title} 
          loading="lazy" 
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150x150?text=Music"; }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" 
        />
      </div>
      <div className="w-full text-center px-0.5">
        <p className="text-[11px] font-extrabold text-white leading-tight line-clamp-1">{title}</p>
        <p className="text-[9px] font-medium text-neutral-400 mt-0.5 line-clamp-1 capitalize">{subtitle}</p>
      </div>
    </div>
  );
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const[activeTab, setActiveTab] = useState("all");
  
  // States for 'All' Tab
  const[allData, setAllData] = useState({ topMatches: [], songs: [], albums: [], playlists: [], artists:[] });
  
  // States for Infinite Scroll Tabs
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const tabs =[
    { id: "all", label: "All", icon: Sparkles },
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset states when Query or Tab changes
  useEffect(() => {
    setResults([]);
    setAllData({ topMatches: [], songs: [], albums: [], playlists:[], artists: [] });
    setPage(1);
    setHasMore(true);
  },[debouncedQuery, activeTab]);

  // Main Fetch Logic
  useEffect(() => {
    if (!debouncedQuery.trim()) return;

    const fetchData = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        if (activeTab === "all") {
          // Fetch everything for the 'All' tab simultaneously
          const [sRes, aRes, pRes, arRes] = await Promise.all([
            fetch(`https://ayushm-psi.vercel.app/api/search/songs?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/albums?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/playlists?query=${encodeURIComponent(debouncedQuery)}&page=1`),
            fetch(`https://ayushm-psi.vercel.app/api/search/artists?query=${encodeURIComponent(debouncedQuery)}&page=1`)
          ]);

          const [sJson, aJson, pJson, arJson] = await Promise.all([sRes.json(), aRes.json(), pRes.json(), arRes.json()]);

          const songs = sJson.data?.results || sJson.data ||[];
          const albums = aJson.data?.results || aJson.data || [];
          const playlists = pJson.data?.results || pJson.data ||[];
          const artists = arJson.data?.results || arJson.data ||[];

          // Smart "Best Match" Engine
          const combined =[
            ...songs.map((i: any) => ({ ...i, type: "song" })),
            ...albums.map((i: any) => ({ ...i, type: "album" })),
            ...playlists.map((i: any) => ({ ...i, type: "playlist" })),
            ...artists.map((i: any) => ({ ...i, type: "artist" }))
          ];

          // Sort by text relevance and grab top 4
          const sortedMatches = combined
            .map(item => ({ item, score: getMatchScore(item.title || item.name, debouncedQuery) }))
            .filter(match => match.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(match => match.item)
            .slice(0, 4);

          // Fallback to top 1 from each category if no strict match
          const topMatches = sortedMatches.length > 0 ? sortedMatches : combined.slice(0, 4);

          setAllData({ topMatches, songs: songs.slice(0, 8), albums: albums.slice(0, 8), playlists: playlists.slice(0, 8), artists: artists.slice(0, 8) });
          setHasMore(false); // No infinite scroll on 'All' tab
        } else {
          // Fetch specific tab with Infinite Scroll pagination
          const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${activeTab}?query=${encodeURIComponent(debouncedQuery)}&page=${page}`);
          const json = await res.json();
          const newData = json.data?.results || json.data ||[];

          if (newData.length === 0) {
            setHasMore(false);
          } else {
            setResults(prev => [...prev, ...newData]);
          }
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
      setLoadingMore(false);
    };

    fetchData();
  }, [debouncedQuery, activeTab, page]);

  // Infinite Scroll Observer Setup
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore || !hasMore || activeTab === "all") return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore, activeTab]);

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
    <main className="min-h-screen pt-12 pb-28 bg-black">
      <div className="px-4 mb-4">
        <h1 className="text-3xl font-black tracking-tighter text-white">Search</h1>
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-2xl pt-2 pb-3 px-4 border-b border-white/5">
        <div className="relative flex items-center w-full h-12 rounded-xl bg-neutral-900 border border-neutral-800 focus-within:border-neutral-500 shadow-lg">
          <div className="grid place-items-center h-full w-12 text-neutral-400">
            <SearchIcon size={18} />
          </div>
          <input
            className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-10 placeholder-neutral-500 font-medium"
            type="text"
            placeholder="Songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 text-neutral-400 hover:text-white">
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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  isActive ? "bg-white text-black scale-105" : "bg-neutral-900 text-neutral-400 border border-neutral-800 active:scale-95"
                }`}
              >
                <tab.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-neutral-400" size={32} /></div>
        ) : !debouncedQuery.trim() ? (
          <div className="flex flex-col items-center justify-center mt-24 text-neutral-600 animate-slide-down">
            <SearchIcon size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold text-neutral-400">Find your music</p>
          </div>
        ) : activeTab === "all" ? (
          /* "ALL" TAB LAYOUT */
          <div className="flex flex-col gap-8">
            {/* Top Results */}
            {allData.topMatches.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Sparkles size={18} className="text-amber-400"/> Best Matches</h2>
                <div className="grid grid-cols-4 gap-3">
                  {allData.topMatches.map((item: any, i) => (
                    <SearchCard key={`top-${i}`} item={item} index={i} onClick={handleItemClick} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Category Rows */}
            {[
              { title: "Songs", data: allData.songs, type: "songs" },
              { title: "Albums", data: allData.albums, type: "albums" },
              { title: "Artists", data: allData.artists, type: "artists" },
              { title: "Playlists", data: allData.playlists, type: "playlists" },
            ].map((section, idx) => section.data.length > 0 && (
              <div key={idx}>
                <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
                <div className="grid grid-cols-4 gap-3">
                  {section.data.map((item: any, i: number) => (
                    <SearchCard key={`${section.type}-${i}`} item={item} tabType={section.type} index={i} onClick={handleItemClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* SPECIFIC TAB LAYOUT (WITH INFINITE SCROLL) */
          <div>
            <div className="grid grid-cols-4 gap-3">
              {results.map((item, index) => (
                <SearchCard key={index} item={item} tabType={activeTab} index={index} onClick={handleItemClick} />
              ))}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            <div ref={lastElementRef} className="h-10 mt-6 flex justify-center items-center w-full">
              {loadingMore && <Loader2 className="animate-spin text-neutral-500" size={24} />}
              {!hasMore && results.length > 0 && <p className="text-xs text-neutral-600 font-medium">End of results</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
