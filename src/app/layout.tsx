import type { Metadata, Viewport } from "next";
import { Alexandria } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { AuthProvider } from "@/lib/auth";

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MAFIA | مافيا",
  description: "لعبة مافيا الجماعية — اكذب، أقنع، واكشف المافيا",
  appleWebApp: { capable: true, title: "مافيا", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthProvider><SessionProvider>{children}</SessionProvider></AuthProvider>
      </body>
    </html>
  );
}
