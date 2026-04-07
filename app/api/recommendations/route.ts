import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid');

  if (!vid) {
    return NextResponse.json({ error: "Missing Video ID" }, { status: 400 });
  }

  try {
    // Fetches on the SERVER side, hiding your API endpoint from the client network tab
    const res = await fetch(`https://ayushmind.vercel.app/api/rec?vid=${vid}`, {
      next: { revalidate: 3600 } // Cache results for 1 hour for extreme speed
    });
    
    if (!res.ok) throw new Error("Failed to fetch");
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
