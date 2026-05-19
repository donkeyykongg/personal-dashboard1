import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarStateProvider } from "@/components/layout/sidebar-state";
import { CommandPalette } from "@/components/layout/command-palette";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Dashboard",
  description: "Finances, subscriptions, notes, and posting schedule",
};

const themeFlashScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeFlashScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <SidebarStateProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
              </main>
            </div>
            <CommandPalette />
          </SidebarStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
