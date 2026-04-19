// page.tsx
import { Metadata, ResolvingMetadata } from "next";
import PlaySongClient from "./PlaySongClient";

type Props = {
  params: { slug: string; id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// This function tells Next.js to generate Open Graph tags dynamically
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, id } = params;

  // Replicate your ID cleaning logic for the server fetch
  let cleanId = id;
  if (id && id.includes("&token=")) {
    cleanId = id.split("&token=")[0];
  }

  const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
  
  try {
    const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      const song = json.data[0];
      
      // Get the highest quality image available (JioSaavn API usually returns an array of images)
      const imageUrl = Array.isArray(song.image) 
        ? song.image[song.image.length - 1]?.link || song.image[0]?.link 
        : song.image;

      // Artist name fallback
      const artists = song.primaryArtists || song.singers || "Unknown Artist";

      return {
        title: `${song.name} | MusicAyush`,
        description: `Listen to ${song.name} by ${artists} on MusicAyush.`,
        openGraph: {
          title: song.name,
          description: `Listen to ${song.name} by ${artists}`,
          url: `https://musicayush.vercel.app/play/song/${slug}/${id}`,
          siteName: "MusicAyush",
          images:[
            {
              url: imageUrl,
              width: 500, // Good size for WhatsApp previews
              height: 500,
              alt: song.name,
            },
          ],
          type: "music.song",
        },
        twitter: {
          card: "summary_large_image",
          title: song.name,
          description: `Listen to ${song.name} by ${artists}`,
          images: [imageUrl],
        },
      };
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }

  // Fallback if the fetch fails
  return {
    title: "Play Song | MusicAyush",
    description: "Listen to your favorite songs on MusicAyush.",
  };
}

// Render the Client Component and pass the params down
export default function PlaySongPage({ params }: Props) {
  return <PlaySongClient slug={params.slug} id={params.id} />;
}
