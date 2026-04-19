 import { Metadata } from "next";
import PlaySongClient from "./PlaySongClient";

// "any" bypasses the Vercel TypeScript build errors entirely
export async function generateMetadata({ params }: any): Promise<Metadata> {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  let cleanId = resolvedParams?.id || "";
  
  cleanId = cleanId.split("?")[0].split("&")[0];

  const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
  
  try {
    const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`, {
      // Adding a User-Agent so your API doesn't block the server fetch
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const json = await res.json();
    
    let song = json?.data?.[0] || json?.[0] || json?.data || json;

    if (song && song.name) {
      const title = `${song.name} | MusicAyush`;
      const artists = song.primaryArtists || song.singers || "Unknown Artist";
      const description = `Listen to ${song.name} by ${artists}`;
      
      // Grabs the highest quality image for WhatsApp OpenGraph
      let imgUrl = "https://ui-avatars.com/api/?name=Music+Ayush&background=1db954&color=fff&size=500";
      if (Array.isArray(song.image)) {
        imgUrl = song.image[song.image.length - 1]?.link || song.image[0]?.link || imgUrl;
      } else if (typeof song.image === "string") {
        imgUrl = song.image;
      }

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

  // Fallback if the API fails
  return {
    title: "Play Song | MusicAyush",
    description: "Listen to your favorite songs on MusicAyush.",
  };
}

export default async function PlaySongPage({ params, searchParams }: any) {
  // Await promises to ensure Next.js 14/15 compatibility
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
