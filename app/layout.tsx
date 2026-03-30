import { AppProvider } from "../context/AppContext";
import BottomNav from "../components/BottomNav";
import MiniPlayer from "../components/MiniPlayer";
import "./globals.css";

export const metadata = {
  title: "Music@8481",
  description: "Premium Music Player",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white pb-24 selection:bg-neutral-800 antialiased">
        <AppProvider>
          {children}
          <MiniPlayer />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
