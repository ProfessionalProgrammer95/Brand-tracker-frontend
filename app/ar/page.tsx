"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

type Mention = {
  text: string;
  sentiment: number;
};

export default function ARPage() {
  const [ready, setReady] = useState(false);
  const [mentions, setMentions] = useState<Mention[]>([]);

  // Load A-Frame + AR.js scripts
  useEffect(() => {
    const loadScripts = async () => {
      const aframe = document.createElement("script");
      aframe.src = "https://aframe.io/releases/1.4.0/aframe.min.js";
      aframe.async = true;
      document.head.appendChild(aframe);

      aframe.onload = () => {
        const arjs = document.createElement("script");
        arjs.src =
          "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar-nft.js";
        arjs.async = true;
        document.head.appendChild(arjs);

        arjs.onload = () => setReady(true);
      };
    };

    loadScripts();
  }, []);

  // Fetch live mentions every 4s
  useEffect(() => {
    if (!ready) return;

    const fetchMentions = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/live/latest");
        setMentions(res.data.items || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.log("AR fetch error:", msg);
      }
    };

    fetchMentions();
    const interval = setInterval(fetchMentions, 4000);
    return () => clearInterval(interval);
  }, [ready]);

  if (!ready)
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading AR…
      </div>
    );

  // Convert mentions → AR bubbles
  const bubbles = mentions
    .map((m) => {
      const x = (Math.random() - 0.5) * 3;
      const y = Math.random() * 1.8 + 0.5;
      const z = (Math.random() - 0.5) * 3;

      const color =
        m.sentiment > 0 ? "#4ade80" : m.sentiment < 0 ? "#f97373" : "#38bdf8";

      return `
        <a-entity position="${x} ${y} ${z}" 
          animation="property: rotation; to: 0 360 0; dur: 8000; loop: true; easing: linear">
          
          <a-sphere radius="0.15" color="${color}" emissive="${color}" emissive-intensity="1.4"></a-sphere>

          <a-entity position="0 0.35 0"
            text="value: ${m.text.replace(/"/g, "'")}; width: 2.2; align: center; color: ${color}">
          </a-entity>
        </a-entity>
      `;
    })
    .join("");

  // Generate stars
  const stars = [...Array(30)]
    .map(() => {
      const x = (Math.random() - 0.5) * 6;
      const y = Math.random() * 3;
      const z = (Math.random() - 0.5) * 6;
      return `
        <a-sphere 
          position="${x} ${y} ${z}" 
          radius="0.02" 
          color="#ffffff"
          animation="property: scale; dir: alternate; to: 1.7 1.7 1.7; dur: 1500; loop: true;">
        </a-sphere>`;
    })
    .join("");

  return (
    <div
      className="mt-24"
      dangerouslySetInnerHTML={{
        __html: `
      <style>
        body, html {
          margin: 0; padding: 0; overflow: hidden;
          background: black;
        }
        .hud {
          position: fixed; top: 12px; left: 12px; right: 12px;
          display: flex; justify-content: space-between;
          font-family: system-ui; z-index: 20;
        }
        .badge {
          background: rgba(17, 24, 39, 0.8);
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.4);
          color: #e5e7eb; font-size: 11px;
        }
      </style>

      <div class="hud">
        <div class="badge">Live Brand Galaxy AR</div>
        <div class="badge">Objects float — no marker needed</div>
      </div>

      <a-scene
        vr-mode-ui="enabled: false"
        embedded
        renderer="antialias: true; logarithmicDepthBuffer: true;"
        arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
        style="position: fixed; inset:0; width:100%; height:100%;"
      >

        <!-- Brand Center Orb -->
        <a-entity position="0 1.3 -3">
          <a-sphere radius="0.35" color="#c084fc" emissive="#c084fc" emissive-intensity="1.2"></a-sphere>
          <a-entity text="value: Brand Galaxy; width: 3; align: center; color:#fff" position="0 0.6 0"></a-entity>
        </a-entity>

        <!-- Orbit Ring -->
        <a-entity position="0 1.3 -3"
          animation="property: rotation; to: 0 360 0; dur: 12000; loop: true; easing: linear">
          <a-torus radius="1.1" radius-tubular="0.03" color="#64748b" opacity="0.5"></a-torus>
        </a-entity>

        <!-- Stars -->
        ${stars}

        <!-- Live Mentions -->
        ${bubbles}

        <!-- Camera -->
        <a-entity camera></a-entity>

      </a-scene>
    `,
      }}
    />
  );
}
