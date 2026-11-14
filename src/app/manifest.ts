import type { MetadataRoute } from "next";

/** Cho phép "Thêm vào màn hình chính" (iPhone cần điều này để nhận thông báo đẩy) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Class Master – Quản lý lớp chủ nhiệm",
    short_name: "Class Master",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
