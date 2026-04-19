import { Metadata, ResolvingMetadata } from "next";
import PlaySongClient from "./PlaySongClient";

type Props = {
  params: { slug: string; id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, id } = params;

  let cleanId = decodeURIComponent(id);
  if (cleanId.includes("&token=")) cleanId = cleanId.split("&token=")[0];
  if (cleanId.includes("?token=")) cleanId = cleanId.split("?token=")[0];

  const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
  
  let title = "Play Song | MusicAyush";
  let description = "Listen to your favorite songs on MusicAyush.";
  // Removed the Spotify picture! Now uses a plain green fallback generator
  let imageUrl = "https://ui-avatars.com/api/?name=Music+Ayush&background=1db954&color=fff&size=500"; 
  
  try {
    const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`, { cache: 'no-store' });
    const json = await res.json();

    let song = null;
    if (json.success && json.data && json.data.length > 0) {
      song = json.data[0];
    } else if (Array.isArray(json) && json.length > 0) {
      song = json[0];
    } else if (json.data && !Array.isArray(json.data)) {
      song = json.data;
    }

    if (song) {
      title = `${song.name || 'Unknown Song'} | MusicAyush`;
      const artists = song.primaryArtists || song.singers || "Unknown Artist";
      description = `Listen to ${song.name || 'this track'} by ${artists}`;
      
      // FIXED IMAGE EXTRACTION: Some API versions use 'url' instead of 'link'. This catches both.
      if (Array.isArray(song.image) && song.image.length > 0) {
        const imgObj = song.image[song.image.length - 1] || song.image[0];
        imageUrl = imgObj?.link || imgObj?.url || imgObj || imageUrl;
      } else if (typeof song.image === 'string') {
        imageUrl = song.image;
      }
    }
  } catch (error) {
    console.error("Metadata Fetch Error:", error);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://musicayush.vercel.app/play/song/${slug}/${cleanId}`,
      siteName: "MusicAyush",
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
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function PlaySongPage({ params }: Props) {
  return <PlaySongClient slug={params.slug} id={params.id} />;
}
