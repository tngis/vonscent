import type { NextConfig } from "next";

/**
 * Allow remote images from Supabase Storage (when configured) plus a couple of
 * hosts used by seed/placeholder data so the demo renders without live storage.
 */
const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "picsum.photos" },
];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    // Supabase public objects: <project>.supabase.co/storage/v1/object/public/...
    remotePatterns.push({
      protocol: "https",
      hostname: url.hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // ignore malformed NEXT_PUBLIC_SUPABASE_URL
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
