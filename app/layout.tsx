import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Pipeline",
  description: "Calgary SEO & Web Design lead pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-4">
          <span className="font-semibold text-white">Sales Pipeline</span>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
