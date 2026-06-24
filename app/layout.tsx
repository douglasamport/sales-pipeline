import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Sales Pipeline",
  description: "Calgary SEO & Web Design lead pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Providers>
          <NavBar />
          <main className="p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
