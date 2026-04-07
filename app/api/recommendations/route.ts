import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disables all caching globally for this route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid');

  if (!vid) {
    return NextResponse.json({ error: "Missing Video ID" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://ayushmind.vercel.app/api/rec?vid=${vid}`, {
      cache: 'no-store' // Strictly no caching
    });
    
    if (!res.ok) throw new Error("Failed to fetch");
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
