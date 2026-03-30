"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Reusable slider for different sections
const Carousel = ({ title, items, isCircular = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <div key={i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-36 cursor-pointer active:scale-95 transition-transform">
            <img 
              src={getImageUrl(item.image)} 
              alt={item.title || item.name} 
              className={`w-36 h-36 object-cover bg-neutral-800 shadow-lg ${isCircular ? "rounded-full" : "rounded-2xl"}`}
            />
            <p className="text-sm font-bold mt-3 truncate text-neutral-100">{item.title || item.name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {item.subtitle || (item.type === "artist" ? "Artist" : "Music@8481")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [data, setData] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<any>(null);
  const[loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Using the proxy we set up in next.config.ts to avoid CORS blocks
        const res = await fetch(`/api/jiosaavn?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`);
        const json = await res.json();
        setData(json);

        const artistRes = await fetch(`/api/jiosaavn?__call=social.getTopArtists&api_version=4&_format=json&_marker=0&ctx=wap6dot0`);
        const artistJson = await artistRes.json();
        setTopArtists(artistJson.top_artists);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [language]);

  // Handles clicking on anything on the home page and routing it correctly
  const handlePlayableClick = (item: any) => {
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
    } else {
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-neutral-400 font-medium">Loading Music@8481...</p>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-24 bg-gradient-to-b from-neutral-900 to-black min-h-screen">
      <h1 className="text-4xl font-black px-4 mb-8 tracking-tighter text-white">Music@8481</h1>
      
      <div className="mb-8 px-4">
        <h2 className="text-2xl font-bold mb-4 tracking-tight text-white">For You</h2>
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-neutral-700/50 flex flex-col items-center justify-center h-32 shadow-lg backdrop-blur-sm">
          <p className="text-neutral-200 font-bold text-lg">Your Mix</p>
          <p className="text-neutral-400 text-xs mt-1">Algorithm in development...</p>
        </div>
      </div>

      <Carousel title="Trending" items={data?.new_trending} onItemClick={handlePlayableClick} />
      <Carousel title="New Releases" items={data?.new_albums} onItemClick={handlePlayableClick} />
      <Carousel title="Top Charts" items={data?.charts} onItemClick={handlePlayableClick} />
      <Carousel title="Editorial Picks" items={data?.top_playlists} onItemClick={handlePlayableClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handlePlayableClick} />
    </main>
  );
}
