"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  
  const { setCurrentSong, setIsPlaying } = useAppContext();
  const [artist, setArtist] = useState<any>(null);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const[topAlbums, setTopAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        // Fetch all 3 APIs at the same time for maximum speed
        const [artistRes, songsRes, albumsRes] = await Promise.all([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums`)
        ]);

        const artistJson = await artistRes.json();
        const songsJson = await songsRes.json();
        const albumsJson = await albumsRes.json();

        setArtist(artistJson.data);
        setTopSongs(songsJson.data?.songs ||[]);
        setTopAlbums(albumsJson.data?.albums ||[]);
      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={32} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-black text-white">Artist not found</div>;

  return (
    <div className="pb-24 min-h-screen bg-black">
      {/* Artist Header */}
      <div className="relative w-full h-80 bg-neutral-900 overflow-hidden flex flex-col justify-end">
        {/* Blurred Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 blur-xl"
          style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-black/40 p-2 rounded-full backdrop-blur-md z-20">
          <ArrowLeft size={24} className="text-white" />
        </button>

        <div className="flex flex-col items-center z-10 pb-6">
          <img src={getImageUrl(artist.image)} className="w-32 h-32 rounded-full shadow-2xl object-cover border-4 border-neutral-800 mb-3" />
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            {artist.name} {artist.isVerified && <BadgeCheck className="text-blue-500" size={24} fill="currentColor" />}
          </h1>
          <p className="text-sm text-neutral-400 mt-1 font-medium">
            {artist.followerCount ? `${artist.followerCount.toLocaleString()} Followers` : "Artist"}
          </p>
        </div>
      </div>

      {/* Play Button */}
      <div className="flex justify-center -mt-6 relative z-20 mb-6">
        <button 
          onClick={() => { if (topSongs.length) { setCurrentSong(topSongs[0]); setIsPlaying(true); } }} 
          className="bg-white text-black p-4 rounded-full active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <Play fill="black" size={28} className="ml-1" />
        </button>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <div className="px-4 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Popular Songs</h2>
          <div className="flex flex-col gap-2">
            {topSongs.slice(0, 5).map((song: any, index: number) => (
              <div key={song.id} onClick={() => { setCurrentSong(song); setIsPlaying(true); }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-900 cursor-pointer active:scale-95 transition-all">
                <span className="text-neutral-500 text-sm font-medium w-4 text-center">{index + 1}</span>
                <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover" />
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-sm font-bold text-white truncate">{song.name || song.title}</h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{song.album?.name || artist.name}</p>
                </div>
                <MoreVertical size={20} className="text-neutral-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-4">
            {topAlbums.map((album: any) => (
              <div 
                key={album.id} 
                onClick={() => router.push(`/album?link=${encodeURIComponent(album.url)}`)} 
                className="flex-shrink-0 snap-start w-36 cursor-pointer active:scale-95 transition-transform"
              >
                <img src={getImageUrl(album.image)} alt={album.name} className="w-36 h-36 rounded-xl object-cover shadow-lg bg-neutral-800" />
                <h3 className="text-sm font-bold text-white mt-2 truncate">{album.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{album.year || "Album"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={32} /></div>}>
      <ArtistContent />
    </Suspense>
  );
}
