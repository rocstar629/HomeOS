import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Navigation } from "@/components/layout/Navigation";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FamilyOS",
  description: "Family-focused smart home interface",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50`}>
        <Providers>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
              <div className="px-4 md:px-8 pt-4 flex justify-end items-center gap-2">
                <ConnectionStatus />
                <Link
                  href="/settings"
                  aria-label="Settings"
                  title="Settings"
                  className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Settings className="w-5 h-5" aria-hidden />
                </Link>
              </div>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
