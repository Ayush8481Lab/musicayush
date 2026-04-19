import { Metadata } from "next";
import { Suspense } from "react";
import PlaySongClient from "./PlaySongClient";

type Props = {
  // Safely handles both Next.js 13/14 (object) and Next.js 15 (Promise)
  params: Promise<{ slug: string; id: string }> | { slug: string; id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Safely resolve the params (Fixes crash on newer Next.js versions)
  const resolvedParams = await Promise.resolve(params);
  const { slug, id } = resolvedParams;
  
  const link = `https://www.jiosaavn.com/song/${slug}/${id}`;
  const shareUrl = `https://musicayush.vercel.app/play/song/${slug}/${id}`;
  
  // High-quality fallback image so WhatsApp NEVER shows a blank square
  const fallbackImage = "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000&auto=format&fit=crop";

  try {
    const res = await fetch(
      `https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        },
        cache: "no-store" 
      }
    );
    
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      const song = json.data[0];
      
      const title = song.name ? decodeHTMLEntities(song.name) : "Shared Song";
      const artist = song.primaryArtists || "Unknown Artist";
      const description = `Listen to ${title} by ${artist} on My Music App.`;
      
      let imageUrl = song.image?.[song.image.length - 1]?.link || song.image?.[0]?.link || song.image;
      if (typeof imageUrl === 'string') {
        imageUrl = imageUrl.replace("150x150", "500x500").replace("50x50", "500x500");
      }

      return {
        title: `${title} | Music App`,
        description: description,
        openGraph: {
          title: title,
          description: description,
          url: shareUrl,
          siteName: "Music App",
          images:[
            {
              url: imageUrl || fallbackImage,
              width: 500,
              height: 500,
              alt: title,
            },
          ],
          type: "music.song",
        },
        twitter: {
          card: "summary_large_image",
          title: title,
          description: description,
          images: [imageUrl || fallbackImage],
        },
      };
    }
  } catch (err) {
    console.error("Metadata fetch error:", err);
  }

  // --- SAFE FALLBACK ---
  return {
    title: "Play Song - Music App",
    description: "Listen to ad-free music on My Music App.",
    openGraph: {
      title: "Play Song - Music App",
      description: "Listen to ad-free music on My Music App.",
      url: shareUrl,
      siteName: "Music App",
      images:[
        {
          url: fallbackImage,
          width: 800,
          height: 600,
          alt: "Music App",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Play Song - Music App",
      description: "Listen to ad-free music on My Music App.",
      images: [fallbackImage],
    },
  };
}

function decodeHTMLEntities(text: string) {
  if (!text) return "";
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// 🚨 THIS IS THE CRITICAL FIX: The <Suspense> wrapper 🚨
export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
        <p className="text-[#1db954] font-bold text-lg tracking-wide animate-pulse">
          Loading Metadata...
        </p>
      </div>
    }>
      <PlaySongClient />
    </Suspense>
  );
}
