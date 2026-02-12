import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import { MaterialThemeProvider } from "@/contexts/MaterialThemeProvider";
import { E2EEInitializer } from "@/components/E2EEInitializer";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: "Squad Link - Connect with your circle",
  description: "Where conversations come alive. Chat with friends, share moments, and stay connected.",
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Squad Link",
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#9333ea",
    viewportFit: "cover",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <MaterialThemeProvider>
          <E2EEInitializer />
          {children}
        </MaterialThemeProvider>
      </body>
    </html>
  );
}
