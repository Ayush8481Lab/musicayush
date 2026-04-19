import { Metadata } from "next";
import dynamic from "next/dynamic";

// 🚨 THIS IS THE MAGIC FIX 🚨
// This disables Server-Side Rendering (SSR) for the audio player.
// It stops 'useAppContext' from crashing the server and deleting your Meta Tags.
const PlaySongClient = dynamic(() => import("./PlaySongClient"), { 
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
      <p className="text-[#1db954] font-bold text-lg tracking-wide animate-pulse">
        Loading Track Data...
      </p>
    </div>
  )
});

// Safe dynamic props that work across all Next.js versions
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || "unknown";
  const id = resolvedParams?.id || "unknown";
  
  const link = `https://www.jiosaavn.com/song/${slug}/${id}`;
  const shareUrl = `https://musicayush.vercel.app/play/song/${slug}/${id}`;
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
    
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        const song = json.data[0];
        
        const title = song.name ? song.name.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : "Shared Song";
        const artist = song.primaryArtists || "Unknown Artist";
        const description = `Listen to ${title} by ${artist} on My Music App.`;
        
        let imageUrl = song.image?.[song.image.length - 1]?.link || song.image?.[0]?.link || song.image;
        if (typeof imageUrl === 'string') {
          imageUrl = imageUrl.replace("150x150", "500x500").replace("50x50", "500x500");
        }

        return {
          metadataBase: new URL("https://musicayush.vercel.app"),
          title: `${title} | Music App`,
          description: description,
          openGraph: {
            title: title,
            description: description,
            url: shareUrl,
            siteName: "Music App",
            images:[{ url: imageUrl || fallbackImage, width: 500, height: 500, alt: title }],
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
    }
  } catch (err) {
    console.error("Metadata fetch error:", err);
  }

  // --- SAFE FALLBACK ---
  return {
    metadataBase: new URL("https://musicayush.vercel.app"),
    title: "Play Song - Music App",
    description: "Listen to ad-free music on My Music App.",
    openGraph: {
      title: "Play Song - Music App",
      description: "Listen to ad-free music on My Music App.",
      url: shareUrl,
      siteName: "Music App",
      images:[{ url: fallbackImage, width: 800, height: 600, alt: "Music App" }],
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

export default function Page() {
  // Now rendering the dynamically loaded client component
  return <PlaySongClient />;
}
