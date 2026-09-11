import type { Metadata } from "next";
import { Inter, Great_Vibes } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const script = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--font-script" });

export const metadata: Metadata = {
  title: "Studio Janiquelen Alves",
  description: "Agende seu horário de forma rápida e prática",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${script.variable} font-sans`}>{children}</body>
    </html>
  );
}
