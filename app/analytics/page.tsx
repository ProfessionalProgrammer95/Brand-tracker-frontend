"use client";
import React from "react";
import { useEffect, useMemo, useState,  } from "react";
import {
  getNewsMentions,
  getRedditMentions,
  getTwitterMentions,
  getWebMentions,
  clusterMentions,
} from "@/lib/api";
import io from "socket.io-client";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const socket = io("http://localhost:5000");

type Mention = {
  text: string;
  sentiment: number;
  source: string;
  topic?: string;
  createdAt?: string;
};

/* --------------------------
   3D ANALYTICS SCENE
---------------------------*/

function Sentiment3DScene({ mentions }: { mentions: Mention[] }) {
  const bars = useMemo(() => {
    if (!mentions.length) return [];

    const capped = mentions.slice(-64); // last 64 mentions
    return capped.map((m, idx) => {
      const col = idx % 8;
      const row = Math.floor(idx / 8);

      const baseHeight = Math.min(Math.abs(m.sentiment) + 0.5, 4);
      const x = col - 3.5;
      const z = row - 3.5;

      let color = "#38bdf8"; // neutral
      if (m.sentiment > 0.3) color = "#4ade80";
      else if (m.sentiment < -0.3) color = "#f97373";

      return {
        x,
        z,
        height: baseHeight,
        color,
      };
    });
  }, [mentions]);

  return (
    <Canvas camera={{ position: [6, 7, 10], fov: 55 }}>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 5, 25]} />

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 12, 8]} intensity={1.8} />
      <pointLight position={[-8, 6, -10]} intensity={1.2} />

      {/* Glow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#22c55e"
          emissiveIntensity={0.18}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Bars */}
      {bars.map((b, idx) => (
        <mesh
          key={idx}
          position={[b.x, b.height / 2, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.6, b.height, 0.6]} />
          <meshStandardMaterial
            color={b.color}
            emissive={b.color}
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}

      {/* Floating halo in center */}
      <mesh position={[0, 3.5, 0]}>
        <torusGeometry args={[2.5, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={1.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      <OrbitControls enablePan={false} enableZoom={true} />
    </Canvas>
  );
}

/* --------------------------
   WORD CLOUD
---------------------------*/

const STOPWORDS = new Set([
  "the",
  "and",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "is",
  "it",
  "this",
  "that",
  "with",
  "you",
  "your",
  "our",
  "from",
  "by",
  "be",
  "are",
  "was",
  "were",
  "as",
  "about",
  "just",
  "not",
]);

function WordCloud({ mentions }: { mentions: Mention[] }) {
  const words = useMemo(() => {
    const counts: Record<string, number> = {};
    mentions.forEach((m) => {
      m.text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .forEach((w) => {
          if (!w || STOPWORDS.has(w) || w.length < 3) return;
          counts[w] = (counts[w] || 0) + 1;
        });
    });

    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40);

    const max = entries[0]?.[1] || 1;

    return entries.map(([word, count]) => ({
      word,
      count,
      weight: count / max,
    }));
  }, [mentions]);

  if (!words.length) {
    return <p className="text-xs text-slate-400">No text yet to build cloud.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => {
        const fontSize = 12 + w.weight * 16; // 12px – 28px
        const opacity = 0.5 + w.weight * 0.5;
        return (
          <span
            key={w.word}
            style={{
              fontSize,
              opacity,
            }}
            className="px-2 py-1 rounded-full bg-slate-900/80 border border-sky-500/40 shadow-[0_0_16px_rgba(56,189,248,0.35)] hover:scale-105 transition-transform duration-150 cursor-default"
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}

/* --------------------------
   SENTIMENT x TIME HEATMAP
---------------------------*/

const SENTIMENT_BINS = [
  { label: "Very Neg", min: -999, max: -1.0, color: "#b91c1c" },
  { label: "Neg", min: -1.0, max: -0.2, color: "#f97373" },
  { label: "Neutral", min: -0.2, max: 0.2, color: "#38bdf8" },
  { label: "Pos", min: 0.2, max: 1.0, color: "#4ade80" },
  { label: "Very Pos", min: 1.0, max: 999, color: "#15803d" },
];

function SentimentHeatmap({ mentions }: { mentions: Mention[] }) {
  const { hours, matrix, maxCount } = useMemo(() => {
    if (!mentions.length)
      return { hours: [] as string[], matrix: [] as number[][], maxCount: 0 };

    const now = new Date();
    const last6: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      last6.push(d.getHours().toString().padStart(2, "0") + ":00");
    }

    const buckets: Record<string, number[]> = {};
    last6.forEach((h) => {
      buckets[h] = new Array(SENTIMENT_BINS.length).fill(0);
    });

    mentions.forEach((m) => {
      const d = new Date(m.createdAt || Date.now());
      const key = d.getHours().toString().padStart(2, "0") + ":00";
      if (!buckets[key]) return;

      const s = m.sentiment;
      const binIdx = SENTIMENT_BINS.findIndex(
        (b) => s >= b.min && s < b.max
      );
      if (binIdx === -1) return;
      buckets[key][binIdx] += 1;
    });

    const matrix = last6.map((h) => buckets[h]);
    const maxCount = Math.max(
      1,
      ...matrix.flat().filter((n) => n !== undefined)
    );

    return { hours: last6, matrix, maxCount };
  }, [mentions]);

  if (!hours.length) {
    return (
      <p className="text-xs text-slate-400">
        Heatmap will appear once you have some mentions.
      </p>
    );
  }

  return (
    <div className="text-xs">
      <div className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] gap-[2px]">
        {/* Header row */}
        <div></div>
        {SENTIMENT_BINS.map((b) => (
          <div
            key={b.label}
            className="text-[10px] text-center text-slate-300 pb-1"
          >
            {b.label}
          </div>
        ))}

        {/* Rows */}
        {hours.map((h, rowIdx) => (
          <React.Fragment key={h}>
            <div className="text-[10px] text-slate-400 pr-1 flex items-center justify-end">
              {h}
            </div>
            {SENTIMENT_BINS.map((bin, colIdx) => {
              const val = matrix[rowIdx][colIdx] || 0;
              const intensity = val / maxCount;
              const bg =
                intensity === 0
                  ? "rgba(15,23,42,0.9)"
                  : `${hexToRgba(bin.color, 0.25 + intensity * 0.6)}`;
              const boxShadow =
                intensity === 0
                  ? "none"
                  : `0 0 12px ${hexToRgba(bin.color, 0.75 * intensity)}`;
              return (
                <div
                  key={colIdx}
                  style={{
                    backgroundColor: bg,
                    boxShadow,
                  }}
                  className="h-6 rounded-[4px] transition-all duration-300"
                ></div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Each cell = mention density for that hour & sentiment band. Brighter =
        more activity.
      </p>
    </div>
  );
}

// small helper for heatmap
function hexToRgba(hex: string, alpha: number) {
  const stripped = hex.replace("#", "");
  const num = parseInt(stripped, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* --------------------------
   MAIN PAGE
---------------------------*/

export default function AnalyticsPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [query, setQuery] = useState("iphone");

  useEffect(() => {
  const q = localStorage.getItem("lastQuery") || "iphone";
  setQuery(q);
}, []);

  // Initial load + realtime updates
  // Initial load + realtime updates
useEffect(() => {
  async function loadAll() {
  try {
    const [news, reddit, twitter, web] = await Promise.all([
      getNewsMentions(query),
      getRedditMentions(query),
      getTwitterMentions(query),
      getWebMentions(query),
    ]);

    const combined = [
      ...news.data,
      ...reddit.data,
      ...twitter.data,
      ...web.data,
    ];

    if (!combined.length) return;

    const clustered = await clusterMentions(combined);

    setMentions(clustered.data.mentions);
  } catch (err) {
    console.error("Analytics fetch error:", err);
  }
}


  loadAll();
  const interval = setInterval(loadAll, 5000);

  socket.on("mentions", (payload: any) => {
    setMentions((prev) => [...prev, ...payload.items]);
  });

  return () => {
    clearInterval(interval);
    socket.off("mentions");
  };
}, []);


    // 2D chart data
  const sentimentData = useMemo(
    () => ({
      labels: mentions.map((m) =>
        new Date(m.createdAt || Date.now()).toLocaleTimeString()
      ),
      datasets: [
        {
          label: "Sentiment Trend",
          data: mentions.map((m) => m.sentiment),
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.18)",
          fill: true,
          tension: 0.4,
        },
      ],
    }),
    [mentions]
  );

  // 🔧 FIXED: type as ChartOptions<"line">
  const sentimentOptions: ChartOptions<"line"> = {
    animation: {
      duration: 900,
      easing: "easeOutQuart", // now correctly typed
    },
    scales: {
      y: { min: -3, max: 3 },
    },
  };

  const volumeData = useMemo(() => {
    const volumeByHour: Record<string, number> = {};
    mentions.forEach((m) => {
      const h = new Date(m.createdAt || Date.now())
        .getHours()
        .toString()
        .padStart(2, "0");
      volumeByHour[h] = (volumeByHour[h] || 0) + 1;
    });

    return {
      labels: Object.keys(volumeByHour),
      datasets: [
        {
          label: "Mentions per hour",
          data: Object.values(volumeByHour),
          backgroundColor: "rgba(168,85,247,0.85)",
        },
      ],
    };
  }, [mentions]);

  // 🔧 Type as bar chart options
  const volumeOptions: ChartOptions<"bar"> = {
    animation: {
      duration: 900,
      easing: "easeInOutCubic",
    },
  };

  const sourcePieData = useMemo(() => {
    const sourceCount: Record<string, number> = {};
    mentions.forEach((m) => {
      sourceCount[m.source] = (sourceCount[m.source] || 0) + 1;
    });

    return {
      labels: Object.keys(sourceCount),
      datasets: [
        {
          label: "Sources",
          data: Object.values(sourceCount),
          backgroundColor: ["#4ade80", "#f97373", "#38bdf8", "#a855f7"],
          hoverOffset: 10,
        },
      ],
    };
  }, [mentions]);

  // 🔧 Type as pie chart options
  const sourcePieOptions: ChartOptions<"pie"> = {
    animation: {
      duration: 700,
      easing: "easeOutCirc",
    },
  };

  const topicBarData = useMemo(() => {
    const topicCount: Record<string, number> = {};
    mentions.forEach((m) => {
      const t = m.topic || "Other";
      topicCount[t] = (topicCount[t] || 0) + 1;
    });

    return {
      labels: Object.keys(topicCount),
      datasets: [
        {
          label: "Mentions by Topic",
          data: Object.values(topicCount),
          backgroundColor: "#38bdf8",
        },
      ],
    };
  }, [mentions]);

  // 🔧 Type as bar chart options
  const topicBarOptions: ChartOptions<"bar"> = {
    animation: {
      duration: 700,
      easing: "easeOutBack",
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 md:p-10 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        Brand Galaxy – Live Analytics
      </h1>
      <p className="text-sm text-slate-400 mb-8">
        Real-time sentiment, volume, and topic dynamics, now with 3D glow and
        word cloud intelligence.
      </p>

      {/* TOP: 3D Analytics + Sentiment Line */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.25)] overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-cyan-300">
                3D Sentiment Terrain
              </h2>
              <p className="text-xs text-slate-400">
                Each glowing bar represents a recent mention. Height = sentiment
                magnitude, color = sentiment.
              </p>
            </div>
          </div>
          <div className="h-[320px] md:h-[380px]">
            <Sentiment3DScene mentions={mentions} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 shadow-[0_0_32px_rgba(148,163,184,0.25)]">
          <h2 className="text-lg font-semibold mb-3 text-cyan-200">
            Sentiment Over Time (Live)
          </h2>
          <Line data={sentimentData} options={sentimentOptions} />
        </div>
      </div>

      {/* MIDDLE: Volume + Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-purple-300">
            Mention Volume Growth
          </h2>
          <Bar data={volumeData} options={volumeOptions} />
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-emerald-300">
            Source Distribution
          </h2>
          <Pie data={sourcePieData} options={sourcePieOptions} />
        </div>
      </div>

      {/* BOTTOM: Topic spikes + WordCloud + Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-sky-300">
            Topic Spikes
          </h2>
          <Bar data={topicBarData} options={topicBarOptions} />
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-sky-200">
            Live Word Cloud
          </h2>
          <WordCloud mentions={mentions} />
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-amber-200">
            Sentiment Heatmap (Time × Mood)
          </h2>
          <SentimentHeatmap mentions={mentions} />
        </div>
      </div>
    </div>
  );
}
