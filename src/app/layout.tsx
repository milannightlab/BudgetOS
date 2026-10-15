import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family OS",
  description: "Rodinný OS na správu diania v rodine",
  applicationName: "Family OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Family OS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="sk"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        style={
          {
            "--font-sans": "var(--font-geist-sans)",
          } as React.CSSProperties
        }
      >
        <body className="flex min-h-full flex-col bg-[#F7F9F8] text-foreground font-sans">
          {children}
          <PwaRegister />
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
