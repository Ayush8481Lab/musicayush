"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor for all sizes
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Premium Carousel Component
const Carousel = ({ title, items, isCircular = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 px-4 tracking-tight text-white flex items-center gap-2">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <div key={item.id || i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-36 cursor-pointer group active:scale-95 transition-all duration-300">
            <div className={`overflow-hidden shadow-lg bg-neutral-800 ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-square"}`}>
              <img 
                src={getImageUrl(item.image)} 
                alt={item.title || item.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="text-sm font-bold mt-3 truncate text-neutral-100">{item.title || item.name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {item.subtitle || (item.type === "artist" ? "Artist" : item.header_desc || "Music@8481")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [launchData, setLaunchData] = useState<any>(null);
  const[modules, setModules] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch all 3 APIs in parallel for maximum speed!
        // We use the /api/jiosaavn proxy we set up in next.config.ts to avoid CORS
        const [launchRes, artistsRes, featuredRes] = await Promise.all([
          fetch(`/api/jiosaavn?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=social.getTopArtists&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getFeaturedPlaylists&fetch_from_serialized_files=true&p=1&n=20&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`)
        ]);

        const launchJson = await launchRes.json();
        const artistsJson = await artistsRes.json();
        const featuredJson = await featuredRes.json();

        setLaunchData(launchJson);
        setTopArtists(artistsJson.top_artists ||[]);
        
        // Featured playlists can be an array directly or inside a data object
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data ||[]);

        // Deeply analyze and sort the "modules" object from the launch API
        if (launchJson.modules) {
          const sortedModules = Object.keys(launchJson.modules)
            .map((key) => ({
              key, // e.g., "new_trending", "charts", "promo:vx:data:68"
              ...launchJson.modules[key]
            }))
            .sort((a, b) => a.position - b.position); // Sort by API's intended position
          setModules(sortedModules);
        }
      } catch (error) {
        console.error("Error fetching home data:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [language]);

  // Premium routing logic
  const handleItemClick = (item: any) => {
    const type = item.type;
    const link = item.perma_url || item.url;

    if (type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (type === "album") {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (type === "playlist") {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (type === "artist" || item.artistid) {
      router.push(`/artist?id=${item.artistid || item.id}`);
    } else if (type === "radio_station") {
      // Radios behave like songs in the player
      setCurrentSong(item);
      setIsPlaying(true);
    } else {
      // Fallback
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="text-neutral-400 font-medium tracking-wide">Tuning into Music@8481...</p>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-28 bg-black min-h-screen">
      {/* Header */}
      <div className="px-4 mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tighter text-white">Music@8481</h1>
        <Sparkles className="text-neutral-500" size={24} />
      </div>
      
      {/* Top Artists - First priority */}
      {topArtists.length > 0 && (
        <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
      )}

      {/* Featured Playlists (Custom API requested by you) */}
      {featuredPlaylists.length > 0 && (
        <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />
      )}

      {/* Dynamic Modules from Launch API */}
      {modules.map((mod) => {
        const items = launchData[mod.key]; // Grab the array using the module key
        if (!items || items.length === 0) return null;

        return (
          <Carousel 
            key={mod.key} 
            title={mod.title} // The official title from JioSaavn API
            items={items} 
            onItemClick={handleItemClick} 
          />
        );
      })}
    </main>
  );
}
