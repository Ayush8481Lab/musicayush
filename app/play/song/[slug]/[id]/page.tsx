import { Metadata } from "next";
import PlaySongClient from "./PlaySongClient";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  let cleanId = resolvedParams?.id || "";
  
  cleanId = cleanId.split("?")[0].split("&")[0];

  const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
  
  try {
    const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      cache: "no-store" 
    });
    const json = await res.json();
    
    let song = json?.data?.[0] || json?.[0] || json?.data || json;

    if (song && song.name) {
      const title = `${song.name} | MusicAyush`;
      
      // BULLETPROOF ARTIST EXTRACTION (Supports API v3 & v4)
      let artists = "Unknown Artist";
      if (song.artists && Array.isArray(song.artists.primary)) {
        artists = song.artists.primary.map((a: any) => a.name).join(", ");
      } else if (Array.isArray(song.primaryArtists)) {
        artists = song.primaryArtists.map((a: any) => a.name).join(", ");
      } else if (typeof song.primaryArtists === "string" && song.primaryArtists) {
        artists = song.primaryArtists;
      } else if (typeof song.singers === "string" && song.singers) {
        artists = song.singers;
      }

      const description = `Listen to ${song.name} by ${artists}`;
      
      // BULLETPROOF IMAGE EXTRACTION (Checks for .url AND .link)
      let imgUrl = "https://ui-avatars.com/api/?name=Music+Ayush&background=1db954&color=fff&size=500";
      
      if (Array.isArray(song.image) && song.image.length > 0) {
        const bestImg = song.image[song.image.length - 1]; // Grabs highest quality
        imgUrl = bestImg?.url || bestImg?.link || imgUrl;
      } else if (song.image && typeof song.image === "object") {
        imgUrl = song.image.url || song.image.link || imgUrl;
      } else if (typeof song.image === "string") {
        imgUrl = song.image;
      }

      // Ensure WhatsApp accepts the image by forcing https
      imgUrl = imgUrl.replace("http://", "https://");

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${cleanId}`,
          siteName: "MusicAyush",
          images:[{ url: imgUrl, width: 500, height: 500 }],
          type: "music.song",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imgUrl],
        },
      };
    }
  } catch (error) {
    console.error("Metadata Fetch Error:", error);
  }

  return {
    title: "Play Song | MusicAyush",
    description: "Listen to your favorite songs on MusicAyush.",
  };
}

export default async function PlaySongPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <PlaySongClient 
      slug={resolvedParams?.slug} 
      id={resolvedParams?.id} 
      token={resolvedSearchParams?.token} 
      signature={resolvedSearchParams?.signature} 
    />
  );
}
