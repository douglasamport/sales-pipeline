export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-gray-400 text-sm">
          Your email is not authorized to access this app.
        </p>
      </div>
    </div>
  );
}
