// app/ClientLayout.tsx
'use client';

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import FullScreenButton from '@/components/ui/FullScreenButton';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ← ← ← Ocultar navbar/footer en toda la sección admin y profesional ← ← ←
  const hideLayout = 
    pathname?.startsWith('/profesional') ||   // Login de profesionales
    pathname?.startsWith('/admin');           // Toda la sección admin

  return (
    <>
      {!hideLayout && <Navbar />}
      <main className={!hideLayout ? "flex-grow" : ""}>
        {children}
      </main>
      {!hideLayout && <Footer />}
      {!hideLayout && <WhatsAppButton />}
      {!hideLayout && (
        <FullScreenButton 
          variant="floating" 
          position="top-right" 
          size="md"
        />
      )}
    </>
  );
}