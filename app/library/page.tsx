"use client";
import { Heart, Plus, History, ListMusic } from "lucide-react";

export default function LibraryPage() {
  return (
    <main className="min-h-screen pt-12 pb-24 px-4 bg-black">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Library</h1>
        <button className="p-2 bg-neutral-900 rounded-full text-white">
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-4">
        {/* Liked Songs Tile */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg cursor-pointer active:scale-95 transition-transform">
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
            <Heart fill="white" size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Liked Songs</h2>
            <p className="text-sm text-indigo-200 mt-1">0 songs</p>
          </div>
        </div>

        {/* Recently Played Tile */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg cursor-pointer hover:bg-neutral-800 transition-colors active:scale-95">
          <div className="bg-neutral-800 p-4 rounded-full">
            <History size={28} className="text-neutral-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Recently Played</h2>
            <p className="text-sm text-neutral-400 mt-1">Your listening history</p>
          </div>
        </div>

        {/* Saved Playlists Placeholder */}
        <div className="mt-4">
          <h3 className="text-lg font-bold text-white mb-4">Saved Playlists</h3>
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
            <ListMusic size={40} className="text-neutral-600 mb-3" />
            <p className="text-neutral-400 font-medium">No playlists saved yet.</p>
            <button className="mt-4 px-6 py-2 bg-white text-black text-sm font-bold rounded-full active:scale-95 transition-transform">
              Explore Playlists
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
