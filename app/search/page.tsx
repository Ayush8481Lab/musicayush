"use client";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2, Music2, Disc, ListMusic, Mic2, X } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// Safe Image Extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

// HTML Entity Decoder (fixes &quot;, etc.)
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

// Intelligent Subtitle Extractor
const getSubtitle = (item: any, tab: string) => {
  if (tab === "songs") return item.primaryArtists || item.singers || item.description || "Song";
  if (tab === "albums") return item.artist || item.description || (item.year ? `Album • ${item.year}` : "Album");
  if (tab === "playlists") return item.language ? `${item.language.charAt(0).toUpperCase() + item.language.slice(1)} Playlist` : "Playlist";
  if (tab === "artists") return "Artist";
  return item.description || item.subtitle || "";
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const [query, setQuery] = useState("");
  const[activeTab, setActiveTab] = useState("songs");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const tabs =[
    { id: "songs", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/search/${activeTab}?query=${encodeURIComponent(query)}`);
        const json = await res.json();
        
        // CRITICAL BUG FIX: Safely extract the array regardless of how the API formats it
        let parsedData: any[] =[];
        if (json.data) {
          if (Array.isArray(json.data)) {
            parsedData = json.data;
          } else if (Array.isArray(json.data.results)) {
            parsedData = json.data.results;
          }
        }
        setResults(parsedData);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      }
      setLoading(false);
    };

    // 600ms debounce prevents app crashing from typing too fast
    const timeoutId = setTimeout(() => fetchSearchResults(), 600);
    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  const handleItemClick = (item: any) => {
    // CRITICAL BUG FIX: Ensure the link is a full URL to prevent router crashes
    let link = item.url || item.perma_url || "";
    if (link && !link.startsWith("http")) {
      link = `https://www.jiosaavn.com${link}`;
    }
    
    if (activeTab === "songs" || item.type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (activeTab === "albums" || item.type === "album") {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (activeTab === "playlists" || item.type === "playlist") {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (activeTab === "artists" || item.type === "artist") {
      router.push(`/artist?id=${item.id}`);
    }
  };

  return (
    <main className="min-h-screen pt-12 pb-28 bg-black">
      <div className="px-4 mb-6">
        <h1 className="text-4xl font-black tracking-tighter text-white">Search</h1>
      </div>

      {/* Sticky Header with Premium Glassmorphism */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-2xl pt-2 pb-4 px-4 border-b border-white/5">
        
        {/* Search Bar */}
        <div className="relative flex items-center w-full h-14 rounded-2xl bg-neutral-900 border border-neutral-800 focus-within:border-neutral-500 transition-colors shadow-lg">
          <div className="grid place-items-center h-full w-14 text-neutral-400">
            <SearchIcon size={22} />
          </div>
          <input
            className="peer h-full w-full outline-none text-base text-white bg-transparent pr-12 placeholder-neutral-500 font-medium"
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex gap-3 mt-5 overflow-x-auto hide-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setResults([]); setLoading(true); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105" 
                    : "bg-neutral-900 text-neutral-400 border border-neutral-800 active:scale-95"
                }`}
              >
                <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Results Area */}
      <div className="px-4 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 text-neutral-400">
            <Loader2 className="animate-spin mb-4 text-white" size={36} />
            <p className="font-medium tracking-wide">Searching {activeTab}...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((item, index) => {
              const title = decodeEntities(item.title || item.name);
              const subtitle = decodeEntities(getSubtitle(item, activeTab));
              const isCircular = activeTab === "artists";

              return (
                <div 
                  key={item.id || index} 
                  onClick={() => handleItemClick(item)} 
                  className="animate-slide-down flex flex-col items-center cursor-pointer group active:scale-95 transition-all duration-300"
                  style={{ animationDelay: `${(index % 10) * 0.05}s` }}
                >
                  <div className={`w-full overflow-hidden shadow-lg bg-neutral-900 border border-white/5 mb-3 flex items-center justify-center ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-[1/1]"}`}>
                    <img 
                      src={getImageUrl(item.image)} 
                      alt={title} 
                      loading="lazy" 
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                    />
                  </div>
                  
                  <div className="w-full text-center px-1">
                    <p className="text-[14px] font-extrabold text-white leading-snug line-clamp-2">
                      {title}
                    </p>
                    <p className="text-[12px] font-medium text-neutral-400 mt-1 line-clamp-1">
                      {subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : query.trim() !== "" ? (
          <div className="flex flex-col items-center justify-center mt-24 text-neutral-500 animate-slide-down">
            <SearchIcon size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold text-neutral-400">No {activeTab} found</p>
            <p className="text-sm mt-1">Try searching with a different keyword.</p>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center mt-32 text-neutral-500 animate-slide-down">
            <Music2 size={64} className="mb-6 opacity-10" />
            <p className="text-xl font-bold text-neutral-400 tracking-tight">Play what you love</p>
            <p className="text-sm mt-2 font-medium">Search for artists, songs, albums, and more.</p>
          </div>
        )}
      </div>
    </main>
  );
}
