import { Metadata } from "next";
import PlaySongClient from "./PlaySongClient";

// In Next.js 15+, params must be a Promise
type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 1. AWAIT the params (Crucial for newer Next.js versions)
  const { slug, id } = await params;

  // Next.js automatically strips search queries (?token=) from params.id
  // So 'id' is already clean!
  const link = `https://www.jiosaavn.com/song/${slug}/${id}`;

  try {
    const res = await fetch(
      `https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`
    );
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      const song = json.data[0];
      
      const title = song.name ? decodeHTMLEntities(song.name) : "Unknown Song";
      const artist = song.primaryArtists || "Unknown Artist";
      const description = `Listen to ${title} by ${artist} on My Music App`;
      
      // Get the highest quality image available
      let imageUrl = song.image?.[song.image.length - 1]?.link || song.image?.[0]?.link || song.image;
      
      // JioSaavn trick: force 500x500 high-quality image if possible
      if (typeof imageUrl === 'string') {
        imageUrl = imageUrl.replace("150x150", "500x500").replace("50x50", "500x500");
      }

      return {
        title: title,
        description: description,
        openGraph: {
          title: title,
          description: description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${id}`,
          siteName: "Music App",
          images:[
            {
              url: imageUrl, 
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
          images: [imageUrl],
        },
      };
    }
  } catch (err) {
    console.error("Metadata fetch error:", err);
  }

  // Fallback metadata if API fails or times out
  return {
    title: "Play Song - Music App",
    description: "Listen to the best tracks on My Music App",
  };
}

// Simple helper to clean up weird characters in song titles (like &quot;)
function decodeHTMLEntities(text: string) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export default function Page() {
  return <PlaySongClient />;
}
