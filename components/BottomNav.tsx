"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems =[
    { name: "Home", path: "/", icon: Home },
    { name: "Search", path: "/search", icon: Search },
    { name: "Library", path: "/library", icon: Library },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-black/95 backdrop-blur-md border-t border-neutral-800 pb-safe z-50">
      <div className="flex justify-around items-center p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link href={item.path} key={item.name} className={`flex flex-col items-center p-2 ${isActive ? "text-white" : "text-neutral-500"}`}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
