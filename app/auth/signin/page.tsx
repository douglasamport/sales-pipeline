"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false, callbackUrl: "/leads" });
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Sales Pipeline</h1>
        <p className="text-gray-400 text-sm mb-6">Sign in to continue</p>

        {submitted ? (
          <div className="text-center">
            <p className="text-green-400 font-medium mb-2">Check your email</p>
            <p className="text-gray-400 text-sm">
              If your email is authorized, a sign-in link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition"
            >
              {loading ? "Sending..." : "Send log-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
