"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  getNewsMentions, 
  getRedditMentions,  
  getTwitterMentions, 
  getWebMentions, 
  clusterMentions 
} from "@/lib/api";
import MentionCard from "@/components/MentionCard";
import SentimentSummary from "@/components/SentimentSummary";
import io from "socket.io-client";
import BrandGalaxy from "@/components/BrandGalaxy";
import axios from "axios";
import Navbar from "@/components/Navbar";

const socket = io("http://localhost:5000");

type Mention = {
  source: string;
  text: string;
  url: string;
  sentiment: number;
  topic?: string;
};

export default function Home() {
  const [query, setQuery] = useState("iphone");
  const [results, setResults] = useState<Mention[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // Search function
  const search = async () => {
    const [news, reddit, twitter, web] = await Promise.all([
      getNewsMentions(query),
      getRedditMentions(query),
      getTwitterMentions(query),
      getWebMentions(query),
    ]);

    const joined = [
      ...news.data,
      ...reddit.data,
      ...twitter.data,
      ...web.data,
    ];

    try {
      await axios.post("http://localhost:5000/api/live/update", {
        mentions: joined,
      });
    } catch (err) {
      console.error("Failed to update AR mentions:", err);
    }

    if (!joined.length) {
      setResults([]);
      setTopics([]);
      return;
    }

    const clustered = await clusterMentions(joined);

    setResults(clustered.data.mentions);
    setTopics(clustered.data.topics);
  };

  useEffect(() => {
    socket.on("mentions", (payload: any) => {
      setResults((prev) => [...prev, ...payload.items]);
    });

    return () => socket.off("mentions");
  }, []);

  // Sentiment Weather
  const avgSentiment = useMemo(() => {
    if (!results.length) return 0;
    const sum = results.reduce((acc, m) => acc + m.sentiment, 0);
    return sum / results.length;
  }, [results]);

  const bgStyle = useMemo(() => {
    if (avgSentiment > 0.3) {
      return "radial-gradient(circle at top, rgba(34,197,94,0.4), transparent 60%), radial-gradient(circle at bottom, rgba(59,130,246,0.3), #020617)";
    } else if (avgSentiment < -0.3) {
      return "radial-gradient(circle at top, rgba(248,113,113,0.5), transparent 60%), radial-gradient(circle at bottom, rgba(15,23,42,1), #000000)";
    } else {
      return "radial-gradient(circle at top, rgba(56,189,248,0.4), transparent 60%), radial-gradient(circle at bottom, rgba(88,28,135,0.5), #020617)";
    }
  }, [avgSentiment]);

  return (
    <main className="min-h-screen text-white" style={{ backgroundImage: bgStyle }}>


      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">

        {/* HEADER */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Brand Galaxy Dashboard
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Real-time brand mentions visualized as a living galaxy.
            </p>
          </div>

          <div className="hidden md:block text-xs text-gray-400 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
            Avg Sentiment:{" "}
            <span
              className={
                avgSentiment > 0.1
                  ? "text-green-400"
                  : avgSentiment < -0.1
                  ? "text-red-400"
                  : "text-yellow-300"
              }
            >
              {avgSentiment.toFixed(2)}
            </span>
          </div>
        </header>

        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-4 rounded-2xl bg-gray-900/80 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
            placeholder="Search for your brand, product, or keyword…"
          />

          <button
            onClick={() => {
              localStorage.setItem("lastQuery", query);
              search();
            }}
            className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition font-semibold shadow-[0_0_20px_rgba(34,211,238,0.35)]"
          >
            Launch Scan
          </button>
        </div>

        {/* GALAXY + SENTIMENT SUMMARY */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 rounded-3xl border border-gray-800 bg-slate-900/40 shadow-lg backdrop-blur-lg p-3">
            <BrandGalaxy mentions={results} />
          </div>

          <div className="rounded-3xl border border-gray-800 bg-slate-900/60 shadow-lg backdrop-blur-lg p-4">
            <SentimentSummary mentions={results} />
          </div>
        </div>

        {/* TOPIC CLUSTERS */}
        <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-3xl shadow-lg backdrop-blur-xl mb-10">
          <h2 className="text-lg font-semibold mb-4 text-purple-300">
            Topic Constellations
          </h2>

          {topics.length === 0 && (
            <p className="text-xs text-gray-400">Run a search to see topics.</p>
          )}

          <ul className="space-y-2 text-sm">
            {topics.map((t: any, i: number) => (
              <li key={i} className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-300">• {t.name}</span>
                <span className="text-gray-500">
                  {(t.indices || []).length} mentions
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* LATEST MENTIONS */}
        <h2 className="text-2xl font-bold mb-4">Latest Mentions ({results.length})</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {results.map((m, i) => (
            <MentionCard key={i} mention={m} />
          ))}
        </div>

      </div>
    </main>
  );
}
