import { Metadata } from "next";
import PlaySongClient from "./PlaySongClient";

type Props = {
  params: { slug: string; id: string };
};

// 1. This function runs on the server when WhatsApp/Telegram scrapes the link
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = params;

  // Next.js automatically removes the ?token= part from params.id, 
  // but we apply your cleanId logic just in case
  let cleanId = id;
  if (cleanId.includes("&token=")) {
    cleanId = cleanId.split("&token=")[0];
  }

  const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;

  try {
    const res = await fetch(
      `https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`
    );
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      const song = json.data[0];
      
      const title = song.name || "Unknown Song";
      const artist = song.primaryArtists || "Unknown Artist";
      const description = `Listen to ${title} by ${artist} on My Music App`;
      
      // Usually your API returns an array of images of different sizes. 
      // We grab the highest quality one (usually the last in the array)
      const imageUrl = song.image?.[song.image.length - 1]?.link || song.image?.[0]?.link || song.image;

      // Return the Open Graph Metadata
      return {
        title: title,
        description: description,
        openGraph: {
          title: title,
          description: description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${id}`,
          siteName: "My Music App",
          images:[
            {
              url: imageUrl, // THIS is what WhatsApp uses for the preview image
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

  // Fallback metadata if the API fails
  return {
    title: "Play Song - Music App",
    description: "Listen to the best tracks on My Music App",
  };
}

// 2. This renders your original page so the song still plays normally!
export default function Page() {
  return <PlaySongClient />;
}
