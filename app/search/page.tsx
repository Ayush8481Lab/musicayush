"use client";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Play, Disc, Mic, ListMusic, Loader2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Helper to safely get the best quality image from the API
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/150";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/150";
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const[query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("songs");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs =[
    { id: "songs", label: "Songs", icon: Play },
    { id: "albums", label: "Albums", icon: Disc },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "artists", label: "Artists", icon: Mic },
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
        
        // The API returns arrays directly for songs, but nests them in data.results for others
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

    // Debounce to prevent spamming the API while typing
    const timeoutId = setTimeout(() => {
      fetchSearchResults();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  const handlePlayClick = (item: any) => {
    // If it's a song, play it immediately
    if (activeTab === "songs") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else {
      // In the future, this will navigate to the Album/Playlist/Artist page
      alert(`Routing to ${activeTab} page is coming in the next step!`);
    }
  };

  return (
    <main className="min-h-screen pt-10 pb-24 px-4 bg-black">
      <h1 className="text-3xl font-extrabold mb-6 tracking-tight text-white">Search</h1>

      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl py-2 mb-4">
        <div className="relative flex items-center w-full h-12 rounded-2xl focus-within:shadow-lg bg-neutral-900 overflow-hidden border border-neutral-800">
          <div className="grid place-items-center h-full w-12 text-neutral-400">
            <SearchIcon size={20} />
          </div>
          <input
            className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-4 placeholder-neutral-500"
            type="text"
            id="search"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive ? "bg-white text-black" : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-20 text-neutral-400">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Searching {activeTab}...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {results.map((item, index) => (
            <div 
              key={item.id || index} 
              onClick={() => handlePlayClick(item)}
              className="bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/50 hover:bg-neutral-800 transition cursor-pointer active:scale-95"
            >
              <img 
                src={getImageUrl(item.image)} 
                alt={item.name || item.title} 
                className={`w-full aspect-square object-cover mb-3 shadow-md ${activeTab === 'artists' ? 'rounded-full' : 'rounded-xl'}`}
              />
              <h3 className="text-sm font-bold text-white truncate">{item.name || item.title}</h3>
              <p className="text-xs text-neutral-400 truncate mt-1">
                {activeTab === "songs" && item.artists?.primary?.[0]?.name}
                {activeTab === "albums" && item.year ? `Album • ${item.year}` : ""}
                {activeTab === "playlists" && item.songCount ? `${item.songCount} Songs` : ""}
                {activeTab === "artists" && "Artist"}
              </p>
            </div>
          ))}
        </div>
      ) : query.trim() !== "" ? (
        <div className="text-center mt-20 text-neutral-500">
          <p>No {activeTab} found for "{query}"</p>
        </div>
      ) : (
        <div className="text-center mt-20 text-neutral-500">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-20" />
          <p>Type something to start searching.</p>
        </div>
      )}
    </main>
  );
}
