"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

const Carousel = ({ title, items, isCircular = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 px-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x">
        {items.map((item: any, i: number) => (
          <div key={i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-32 cursor-pointer active:scale-95 transition-transform">
            <img 
              src={item.image?.replace("150x150", "500x500") || "https://via.placeholder.com/150"} 
              alt={item.title || item.name} 
              className={`w-32 h-32 object-cover bg-neutral-800 shadow-lg ${isCircular ? "rounded-full" : "rounded-2xl"}`}
            />
            <p className="text-sm font-semibold mt-3 truncate text-neutral-100">{item.title || item.name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{item.subtitle || "Trending"}</p>
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

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-neutral-400 font-medium animate-pulse">Loading Music@8481...</div>;
  }

  return (
    <main className="pt-12 pb-6">
      <h1 className="text-3xl font-extrabold px-4 mb-8 tracking-tight">Music@8481</h1>

      <Carousel title="Trending" items={data?.new_trending} onItemClick={handlePlayableClick} />
      
      <div className="mb-8 px-4">
        <h2 className="text-xl font-bold mb-4">For You</h2>
        <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-6 border border-neutral-700/50 flex flex-col items-center justify-center h-36 shadow-lg">
          <p className="text-neutral-300 font-medium">Algorithm in development...</p>
          <p className="text-neutral-500 text-xs mt-2">Personalized picks coming soon</p>
        </div>
      </div>

      <Carousel title="New Releases" items={data?.new_albums} onItemClick={handlePlayableClick} />
      <Carousel title="Top Charts" items={data?.charts} onItemClick={handlePlayableClick} />
      <Carousel title="Top Playlists" items={data?.top_playlists} onItemClick={handlePlayableClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handlePlayableClick} />
    </main>
  );
}
