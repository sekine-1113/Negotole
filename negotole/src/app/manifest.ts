import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "negotole",
    short_name: "negotole",
    description: "儚く消える、夜のつぶやき",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f19",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
