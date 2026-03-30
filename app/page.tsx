"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2 } from "lucide-react";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/150";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  return "https://via.placeholder.com/150";
};

const Carousel = ({ title, items, isCircular = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 px-4 tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <div key={i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-36 cursor-pointer active:scale-95 transition-transform">
            <img 
              src={getImageUrl(item.image)} 
              alt={item.title || item.name} 
              className={`w-36 h-36 object-cover bg-neutral-800 shadow-lg ${isCircular ? "rounded-full" : "rounded-xl"}`}
            />
            <p className="text-sm font-bold mt-3 truncate text-white">{item.title || item.name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{item.subtitle || "Music@8481"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [data, setData] = useState<any>(null);
  const[topArtists, setTopArtists] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`);
        const json = await res.json();
        setData(json);

        const artistRes = await fetch(`https://www.jiosaavn.com/api.php?__call=social.getTopArtists&api_version=4&_format=json&_marker=0&ctx=wap6dot0`);
        const artistJson = await artistRes.json();
        setTopArtists(artistJson.top_artists);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [language]);

  const handlePlayableClick = (item: any) => {
    setCurrentSong(item);
    setIsPlaying(true);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>;

  return (
    <main className="pt-12 pb-24 bg-gradient-to-b from-neutral-900 to-black min-h-screen">
      <h1 className="text-4xl font-black px-4 mb-8 tracking-tighter">Music@8481</h1>
      <Carousel title="Trending" items={data?.new_trending} onItemClick={handlePlayableClick} />
      <Carousel title="New Releases" items={data?.new_albums} onItemClick={handlePlayableClick} />
      <Carousel title="Top Charts" items={data?.charts} onItemClick={handlePlayableClick} />
      <Carousel title="Top Playlists" items={data?.top_playlists} onItemClick={handlePlayableClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handlePlayableClick} />
    </main>
  );
}
