"use client";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2, Music, Disc, ListMusic, Mic2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const [query, setQuery] = useState("");
  const[activeTab, setActiveTab] = useState("songs");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Tab definitions
  const tabs =[
    { id: "songs", label: "Songs", icon: Music },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic2 }
  ];

  // Fetch from the custom Vercel API
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
        
        // The API returns songs as a direct array inside 'data', while others are nested in 'results'
        if (activeTab === "songs") {
          setResults(json.data || []);
        } else {
          setResults(json.data?.results ||[]);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
      setLoading(false);
    };

    // Prevent spamming the API on every single keystroke
    const timeoutId = setTimeout(() => fetchSearchResults(), 500);
    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  // Handle routing based on the tab chosen
  const handlePlayClick = (item: any) => {
    const link = item.url || item.perma_url;
    
    if (activeTab === "songs") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (activeTab === "albums") {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (activeTab === "playlists") {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (activeTab === "artists") {
      router.push(`/artist?id=${item.id}`);
    }
  };

  return (
    <main className="min-h-screen pt-12 pb-28 px-4 bg-black">
      <h1 className="text-4xl font-black mb-6 tracking-tighter text-white">Search</h1>

      {/* Sticky Header with Search Bar and Tabs */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl py-3 mb-4">
        <div className="relative flex items-center w-full h-14 rounded-2xl bg-neutral-900 overflow-hidden border border-neutral-800 focus-within:border-neutral-600 transition-colors shadow-lg">
          <div className="grid place-items-center h-full w-14 text-neutral-400">
            <SearchIcon size={22} />
          </div>
          <input
            className="peer h-full w-full outline-none text-base text-white bg-transparent pr-4 placeholder-neutral-500 font-medium"
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-5 overflow-x-auto hide-scrollbar pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                }`}
              >
                <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-24 text-neutral-400">
          <Loader2 className="animate-spin mb-4" size={36} />
          <p className="font-medium">Searching {activeTab}...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {results.map((item, index) => (
            <div 
              key={item.id || index} 
              onClick={() => handlePlayClick(item)} 
              className="bg-neutral-900/50 p-3.5 rounded-2xl border border-neutral-800 hover:bg-neutral-800 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              <img 
                src={getImageUrl(item.image)} 
                alt={item.title || item.name} 
                className={`w-full aspect-square object-cover mb-3 bg-neutral-800 ${activeTab === 'artists' ? 'rounded-full shadow-lg' : 'rounded-xl shadow-md'}`} 
              />
              <h3 className="text-sm font-bold text-white truncate">{item.title || item.name}</h3>
              <p className="text-xs text-neutral-400 truncate mt-1">
                {activeTab === "songs" && (item.primaryArtists || item.singers || "Song")}
                {activeTab === "albums" && item.year ? `Album • ${item.year}` : ""}
                {activeTab === "playlists" && item.songCount ? `${item.songCount} Songs` : ""}
                {activeTab === "artists" && "Artist"}
                {(!item.year && !item.songCount && activeTab !== "songs" && activeTab !== "artists") && (item.subtitle || item.description || "")}
              </p>
            </div>
          ))}
        </div>
      ) : query.trim() !== "" ? (
        <div className="text-center mt-24 text-neutral-500 flex flex-col items-center">
          <SearchIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-bold text-neutral-400">No {activeTab} found</p>
          <p className="text-sm mt-1">Try searching with a different keyword.</p>
        </div>
      ) : (
         <div className="text-center mt-24 text-neutral-500 flex flex-col items-center">
          <SearchIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-bold text-neutral-400">Play what you love</p>
          <p className="text-sm mt-1">Search for artists, songs, albums, and more.</p>
        </div>
      )}
    </main>
  );
}
