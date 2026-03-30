"use client";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/150";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/150";
};

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("songs");
  const [results, setResults] = useState<any[]>([]);
  const[loading, setLoading] = useState(false);

  const tabs = ["songs", "albums", "playlists", "artists"];

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
        
        if (activeTab === "songs") {
          setResults(json.data?.results ||[]);
        } else {
          setResults(json.data?.results ||[]);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
      setLoading(false);
    };

    const timeoutId = setTimeout(() => fetchSearchResults(), 500);
    return () => clearTimeout(timeoutId);
  },[query, activeTab]);

  const handlePlayClick = (item: any) => {
    setCurrentSong(item);
    setIsPlaying(true);
  };

  return (
    <main className="min-h-screen pt-12 pb-24 px-4 bg-black">
      <h1 className="text-4xl font-black mb-6 tracking-tighter text-white">Search</h1>

      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl py-3 mb-4">
        <div className="relative flex items-center w-full h-12 rounded-xl bg-neutral-800 overflow-hidden border border-neutral-700">
          <div className="grid place-items-center h-full w-12 text-neutral-400"><SearchIcon size={20} /></div>
          <input
            className="peer h-full w-full outline-none text-sm text-white bg-transparent pr-4 placeholder-neutral-500"
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-all whitespace-nowrap ${
                activeTab === tab ? "bg-white text-black" : "bg-neutral-900 text-white border border-neutral-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20 text-neutral-400"><Loader2 className="animate-spin" size={32} /></div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {results.map((item, index) => (
            <div key={item.id || index} onClick={() => handlePlayClick(item)} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 cursor-pointer active:scale-95 transition-transform">
              <img src={getImageUrl(item.image)} alt={item.title} className={`w-full aspect-square object-cover mb-3 ${activeTab === 'artists' ? 'rounded-full' : 'rounded-lg'}`} />
              <h3 className="text-sm font-bold text-white truncate">{item.title || item.name}</h3>
              <p className="text-xs text-neutral-400 truncate mt-1">
                {item.description || item.subtitle || (activeTab === 'artists' ? 'Artist' : '')}
              </p>
            </div>
          ))}
        </div>
      ) : query.trim() !== "" ? (
        <p className="text-center mt-20 text-neutral-500">No results found.</p>
      ) : null}
    </main>
  );
}
