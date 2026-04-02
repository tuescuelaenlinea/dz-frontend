// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import WhatsAppButton from "@/components/WhatsAppButton";  // ← AGREGADO: Import del botón

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DZ Salón - Dorian Zambrano | Belleza y Bienestar",
  description: "Transforma tu belleza con los mejores tratamientos estéticos, peluquería, spa y más. Reserva tu cita hoy mismo.",
  keywords: "salón de belleza, spa, peluquería, estética, Dorian Zambrano, tratamientos faciales, manicura, pedicura",
  authors: [{ name: "Dorian Zambrano" }],
  icons: {
    icon: '/favicon.png',  // ← PNG funciona perfectamente
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',  // Para iOS (180x180px)
  },
  openGraph: {
    title: "DZ Salón - Dorian Zambrano",
    description: "Transforma tu belleza con los mejores tratamientos estéticos y de spa",
    type: "website",
    locale: "es_CO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          {/* ← AGREGADO: Botón flotante de WhatsApp en todas las páginas */}
          <WhatsAppButton />
        </AuthProvider>
      </body>
    </html>
  );
}