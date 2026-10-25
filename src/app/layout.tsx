import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const geist = localFont({ src: "../../public/fonts/GeistVF.woff", variable: "--font-geist", display: "swap" });
const mono = localFont({ src: "../../public/fonts/GeistMonoVF.woff", variable: "--font-mono", display: "swap" });
export const metadata: Metadata = {
  title: "Greed Machine — A business that thinks for itself",
  description: "An autonomous treasury foundation: competing agents, independent security, and accountable profit distribution. Explore the working simulation.",
  icons: { icon: "/icon.svg" }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
