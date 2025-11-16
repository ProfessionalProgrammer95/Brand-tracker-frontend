"use client";

import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const gotoAnalytics = () => {
    const q = localStorage.getItem("lastQuery") || "iphone";
    router.push(`/analytics?query=${q}`);
  };

  return (
    <nav className="w-full bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      <h2
        className="text-xl font-semibold text-cyan-300 cursor-pointer"
        onClick={() => router.push("/")}
      >
        Brand Galaxy
      </h2>

      <div className="flex gap-6 text-sm">
        <button
          onClick={() => router.push("/")}
          className="text-white hover:text-cyan-300"
        >
          Dashboard
        </button>

        <button onClick={gotoAnalytics} className=" text-white hover:text-cyan-300">
          Analytics
        </button>

        <button
          onClick={() => router.push("/ar")}
          className="text-white hover:text-cyan-300"
        >
          AR Mode
        </button>
      </div>
    </nav>
  );
}
