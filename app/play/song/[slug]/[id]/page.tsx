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
  const link = `https://www.jiosaavn.com/song/${slug}/${id}`;
  
  // 1. Guaranteed Fallback Values for WhatsApp
  let title = "Play Song | MusicAyush";
  let description = "Listen to your favorite songs on MusicAyush.";
  let imageUrl = "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=500&auto=format&fit=crop"; // Placeholder image if API fails
  
  try {
    // Force the server to not cache this, fetching fresh details
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
      title = `${song.name} | MusicAyush`;
      const artists = song.primaryArtists || song.singers || "Unknown Artist";
      description = `Listen to ${song.name} by ${artists}`;
      
      if (Array.isArray(song.image)) {
        imageUrl = song.image[song.image.length - 1]?.link || song.image[0]?.link;
      } else if (typeof song.image === 'string') {
        imageUrl = song.image;
      }
    }
  } catch (error) {
    console.error("Metadata Fetch Error:", error);
    // Even if it errors, we will still pass the fallback values below to WhatsApp
  }

  // 2. Return the strict OpenGraph tags WhatsApp looks for
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://musicayush.vercel.app/play/song/${slug}/${id}`,
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
