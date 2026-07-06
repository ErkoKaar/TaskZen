import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Martian_Mono } from "next/font/google";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { AppSplash } from "@/components/app-splash";
import { FocusTimerProvider } from "@/lib/focusloop/timer-store";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  weight: ["500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskZen",
  description: "Focus timer and task/habit manager.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0e13",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${martianMono.variable}`}
    >
      <body className="bg-background font-sans antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.16]"
          style={{
            background: "radial-gradient(ellipse 1800px 1400px at 0% 220px, var(--primary), transparent 85%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.09]"
          style={{
            background: "radial-gradient(ellipse 1400px 1100px at 100% 100%, var(--accent), transparent 80%)",
          }}
        />
        <RegisterServiceWorker />
        <FocusTimerProvider>
          <AppSplash />
          {children}
        </FocusTimerProvider>
      </body>
    </html>
  );
}
