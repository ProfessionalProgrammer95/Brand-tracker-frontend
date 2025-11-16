"use client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ChartComponent({ points }: { points: any[] }) {
  const data = {
    labels: points.map((_, i) => i + 1),
    datasets: [
      {
        label: "Sentiment Score",
        data: points.map((p) => p.sentiment),
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34, 211, 238, 0.2)"
      }
    ]
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-xl shadow-lg backdrop-blur">
      <Line data={data} />
    </div>
  );
}
