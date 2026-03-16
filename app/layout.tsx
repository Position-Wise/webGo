import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Nav";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Position Wise Advisory",
  description:
    "Position Wise Advisory is your place to start investing smartly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={workSans.variable}>
      <body className="font-sans bg-background text-foreground transition-colors duration-300">
        <AuthProvider>
          <Navbar />
          {children}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
