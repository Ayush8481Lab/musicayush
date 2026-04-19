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
      
      // 1. EXTRACT ALL ARTISTS (Comma separated)
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

      // 2. EXTRACT LANGUAGE AND ALBUM
      const lang = song.language ? song.language.charAt(0).toUpperCase() + song.language.slice(1) : "Unknown";
      
      let albumName = "Unknown Album";
      if (song.album && typeof song.album === "object" && song.album.name) {
        albumName = song.album.name;
      } else if (typeof song.album === "string") {
        albumName = song.album;
      }

      // 3. YOUR CUSTOM FORMATTED TITLE AND DESCRIPTION
      const title = `${song.name} Song By- ${artists} - Listen on Music@8481`;
      const description = `Listen to ${song.name} on ${lang} Music album ${albumName} by ${artists} - play or Download only Music@8481 Developed By Ayush@8481`;
      
      // Extract highest quality image
      let imgUrl = "https://ui-avatars.com/api/?name=Music+Ayush&background=1db954&color=fff&size=500";
      if (Array.isArray(song.image) && song.image.length > 0) {
        const bestImg = song.image[song.image.length - 1];
        imgUrl = bestImg?.url || bestImg?.link || imgUrl;
      } else if (song.image && typeof song.image === "object") {
        imgUrl = song.image.url || song.image.link || imgUrl;
      } else if (typeof song.image === "string") {
        imgUrl = song.image;
      }
      imgUrl = imgUrl.replace("http://", "https://");

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${cleanId}`,
          siteName: "Music@8481",
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

  // Fallback if the API fails
  return {
    title: "Play on Music@8481",
    description: "Listen or Download only on Music@8481 Developed By Ayush@8481",
    images:[{ url: https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-512x512.png, width: 500, height: 500 }],
    
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
