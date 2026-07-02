"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-semibold text-white">
        Sales Pipeline
      </Link>
      {session && (
        <div className="flex items-center gap-4">
          <Link href="/leads" className="text-sm text-gray-400 hover:text-white transition">
            Leads
          </Link>
          <Link href="/audit" className="text-sm text-gray-400 hover:text-white transition">
            Audit
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
            Dashboard
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 text-sm">{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
