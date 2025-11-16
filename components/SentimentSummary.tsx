"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type Mention = { sentiment: number };

export default function SentimentSummary({ mentions }: { mentions: Mention[] }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const positives = mentions.filter((m) => m.sentiment > 0).length;
    const negatives = mentions.filter((m) => m.sentiment < 0).length;
    const neutrals = mentions.filter((m) => m.sentiment === 0).length;

    const data = [
      { label: "Positive", value: positives, color: "#22c55e" },
      { label: "Neutral", value: neutrals, color: "#38bdf8" },
      { label: "Negative", value: negatives, color: "#f97373" },
    ];

    const width = 260;
    const height = 120;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([20, width - 20])
      .padding(0.3);

    const maxVal = d3.max(data, (d) => d.value) || 1;

    const y = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([height - 30, 20]);

    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.label)!)
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => height - 30 - y(d.value))
      .attr("rx", 6)
      .attr("fill", (d) => d.color);

    svg
      .selectAll("text.label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#cbd5f5")
      .attr("font-size", 11)
      .text((d) => d.label);

    svg
      .selectAll("text.value")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#e5e7eb")
      .attr("font-size", 11)
      .text((d) => d.value);
  }, [mentions]);

  return (
    <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-2xl backdrop-blur">
      <h2 className="text-sm font-semibold mb-2 text-cyan-300">
        Sentiment Summary
      </h2>
      <svg ref={ref} />
    </div>
  );
}
