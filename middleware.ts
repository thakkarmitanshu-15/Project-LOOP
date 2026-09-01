export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/feedback/:path*",
    "/themes/:path*",
    "/reports/:path*",
    "/ask/:path*",
    "/settings/:path*",
  ],
};