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
  title: "BudgetOS",
  description: "Rodinné plánovanie rozpočtu",
  applicationName: "BudgetOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BudgetOS",
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
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          {children}
          <PwaRegister />
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
