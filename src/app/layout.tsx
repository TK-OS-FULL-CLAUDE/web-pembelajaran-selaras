import type { Metadata, Viewport } from "next";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/atkinson-hyperlegible/400-italic.css";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: {
    default: "Selaras — satu materi, setiap siswa bisa mengikuti",
    template: "%s · Selaras",
  },
  description:
    "Guru menulis materi sekali; siswa membukanya dengan teks lebih mudah, bahasa daerah, huruf besar, kontras tinggi, spasi lega, atau dibacakan.",
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <a href="#isi" className="skip-link">
          Lewati ke isi
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
