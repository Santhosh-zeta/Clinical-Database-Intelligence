import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "../contexts/SimulationContext";
import { Shell } from "../components/layout/Shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IntelliCare | Hospital Intelligence System",
  description: "Real-time clinical decision support and vitals monitoring.",
};

import { AuthProvider } from "../contexts/AuthContext";
import { AuthGuard } from "../components/layout/AuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthGuard>
            <SimulationProvider>
              {children}
            </SimulationProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
