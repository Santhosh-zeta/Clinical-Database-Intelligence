import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "../components/layout/Shell";

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
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
