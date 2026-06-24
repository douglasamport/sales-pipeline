import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <h1 className="text-3xl font-bold mb-4">Calgary SEO Pipeline</h1>
      <p className="text-gray-400 mb-8">
        Find, audit, score, and reach out to local businesses that need your services.
      </p>
      <Link
        href="/leads"
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition"
      >
        Go to Lead Dashboard →
      </Link>
    </div>
  );
}
