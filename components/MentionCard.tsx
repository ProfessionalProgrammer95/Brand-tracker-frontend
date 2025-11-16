export default function MentionCard({ mention }: any) {
  return (
    <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl hover:bg-gray-800 transition">
      <p className="text-sm text-gray-400">
        Source: <span className="text-cyan-400">{mention.source}</span>
      </p>

      <p className="text-white mt-2 line-clamp-2">{mention.text}</p>

      <p
        className={`mt-3 font-semibold ${
          mention.sentiment > 0
            ? "text-green-400"
            : mention.sentiment < 0
            ? "text-red-400"
            : "text-yellow-400"
        }`}
      >
        Sentiment: {mention.sentiment}
      </p>

      <a
        href={mention.url}
        target="_blank"
        className="text-cyan-300 underline text-sm mt-2 inline-block"
      >
        View Source →
      </a>
    </div>
  );
}
