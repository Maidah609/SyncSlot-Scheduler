import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "../src/globals.css";

export const metadata: Metadata = {
  title: "SyncSlot",
  description: "Scheduling without the back-and-forth.",
};

const themeInitScript = `(function(){try{var s=localStorage.getItem('syncslot-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
