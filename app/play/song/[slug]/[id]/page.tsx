import { Metadata, ResolvingMetadata } from "next";
import PlaySongClient from "./PlaySongClient";

type Props = {
  params: { slug: string; id: string } | Promise<{ slug: string; id: string }>;
  searchParams: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    // Safely resolve params to support all Next.js versions
    const params = await Promise.resolve(props.params);
    const { slug, id } = params;

    const link = `https://www.jiosaavn.com/song/${slug}/${id}`;
    const apiUrl = `https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`;

    // Adding User-Agent ensures your API doesn't block the Server-Side fetch
    const res = await fetch(apiUrl, { 
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    
    if (!res.ok) throw new Error("API Fetch Blocked or Failed");

    const json = await res.json();

    let song = null;
    if (json?.success && json?.data && json.data.length > 0) {
      song = json.data[0];
    } else if (Array.isArray(json) && json.length > 0) {
      song = json[0];
    } else if (json?.data && !Array.isArray(json.data)) {
      song = json.data;
    } else if (json?.name) {
      song = json;
    }

    if (song) {
      const title = `${song.name || "Unknown Song"} | MusicAyush`;
      const artists = song.primaryArtists || song.singers || "Unknown Artist";
      const description = `Listen to ${song.name || "this track"} by ${artists}`;

      let imageUrl = "https://ui-avatars.com/api/?name=Music+Ayush&background=1db954&color=fff&size=500";
      if (song.image) {
        if (typeof song.image === "string") {
          imageUrl = song.image;
        } else if (Array.isArray(song.image) && song.image.length > 0) {
          const imgObj = song.image[song.image.length - 1] || song.image[0];
          imageUrl = imgObj?.link || imgObj?.url || imageUrl;
        } else if (typeof song.image === "object") {
          imageUrl = song.image.link || song.image.url || imageUrl;
        }
      }
      imageUrl = imageUrl.replace("http://", "https://");

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${id}`,
          siteName: "MusicAyush",
          images:[{ url: imageUrl, width: 500, height: 500, alt: title }],
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
  } catch (error) {
    console.error("Metadata Error:", error);
  }

  // Guaranteed text fallback if API drops
  return {
    title: "Play Song | MusicAyush",
    description: "Listen to your favorite songs on MusicAyush.",
    openGraph: {
      title: "Play Song | MusicAyush",
      description: "Listen to your favorite songs on MusicAyush.",
      type: "website",
    },
  };
}

export default async function PlaySongPage(props: Props) {
  const params = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams);

  // Safely extract searchParams strictly on the Server
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const signature = Array.isArray(searchParams?.signature) ? searchParams.signature[0] : searchParams?.signature;

  return (
    <PlaySongClient
      slug={params.slug}
      id={params.id}
      token={token}
      signature={signature}
    />
  );
}
