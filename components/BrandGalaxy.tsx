"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Mention = {
  sentiment: number;
};

export default function BrandGalaxy({ mentions }: { mentions: Mention[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Basic Three.js setup
    const width = mountRef.current.clientWidth;
    const height = 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 80;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Galaxy geometry
    const geometry = new THREE.BufferGeometry();
    const starCount = Math.max(mentions.length, 50);

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const r = 40;
      const x = (Math.random() - 0.5) * 2 * r;
      const y = (Math.random() - 0.5) * 2 * r;
      const z = (Math.random() - 0.5) * 2 * r;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Map sentiment to color
      const sentiment =
        mentions[i]?.sentiment !== undefined ? mentions[i].sentiment : 0;

      if (sentiment > 0) {
        color.setRGB(0.2, 1, 0.4); // greenish for positive
      } else if (sentiment < 0) {
        color.setRGB(1, 0.3, 0.3); // redish for negative
      } else {
        color.setRGB(0.3, 0.6, 1); // bluish for neutral
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Some ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      points.rotation.y += 0.0015;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      scene.clear();
    };
  }, [mentions]);

  return (
    <div className="mt-8 p-4 bg-gray-900/60 border border-gray-800 rounded-2xl backdrop-blur">
      <h2 className="text-lg font-semibold mb-2 text-cyan-300">
        Brand Galaxy
      </h2>
      <div ref={mountRef} className="w-full" />
      <p className="text-xs text-gray-400 mt-2">
        Each star = a mention. Color = sentiment (green=positive, red=negative, blue=neutral).
      </p>
    </div>
  );
}
