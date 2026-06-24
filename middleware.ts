export { default } from "next-auth/middleware";

export const config = {
  // Protect everything except auth pages and static assets
  matcher: ["/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
