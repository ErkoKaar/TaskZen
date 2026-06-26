import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskZen",
    short_name: "TaskZen",
    description: "Focus timer and task/habit manager.",
    start_url: "/tasks",
    display: "standalone",
    background_color: "#0c0e16",
    theme_color: "#0c0e16",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
