import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Troca Segura",
  description:
    "Marketplace de eletrônicos entre pessoas físicas com inspeção física.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
