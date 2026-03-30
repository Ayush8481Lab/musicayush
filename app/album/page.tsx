"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

function AlbumContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get("link");
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!link) return;
    const fetchAlbum = async () => {
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/albums?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        setAlbum(json.data);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetchAlbum();
  }, [link]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={32} /></div>;
  if (!album) return <div className="flex h-screen items-center justify-center bg-black text-white">Album not found</div>;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="relative h-72 w-full bg-gradient-to-b from-neutral-800 to-black p-4 pt-12 flex flex-col justify-end">
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full backdrop-blur-md">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-end gap-4 z-10">
          <img src={getImageUrl(album.image)} className="w-32 h-32 rounded-xl shadow-2xl object-cover" />
          <div className="overflow-hidden">
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1">Album</p>
            <h1 className="text-2xl font-black truncate text-white">{album.name}</h1>
            <p className="text-sm text-neutral-300 mt-1 truncate">{album.description}</p>
            <p className="text-xs text-neutral-500 mt-1">{album.year} • {album.songCount || album.songs?.length} Songs</p>
          </div>
        </div>
      </div>

      {/* Play Button */}
      <div className="px-4 py-4">
        <button 
          onClick={() => { if (album.songs?.length) { setCurrentSong(album.songs[0]); setIsPlaying(true); } }} 
          className="bg-white text-black p-4 rounded-full active:scale-95 transition-transform shadow-lg"
        >
          <Play fill="black" size={24} />
        </button>
      </div>

      {/* Songs List */}
      <div className="px-4 flex flex-col gap-2 mt-2">
        {album.songs?.map((song: any, index: number) => (
          <div key={song.id} onClick={() => { setCurrentSong(song); setIsPlaying(true); }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-900 cursor-pointer active:scale-95 transition-all">
            <span className="text-neutral-500 text-sm font-medium w-4 text-center">{index + 1}</span>
            <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover" />
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate">{song.name}</h3>
              <p className="text-xs text-neutral-400 truncate mt-0.5">{song.primaryArtists || song.singers}</p>
            </div>
            <MoreVertical size={20} className="text-neutral-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AlbumPage() {
  return (
    <main className="min-h-screen bg-black">
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={32} /></div>}>
        <AlbumContent />
      </Suspense>
    </main>
  );
}
