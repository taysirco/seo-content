import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "SEO Content Writing System",
    template: "%s | SEO Content System",
  },
  description: "A comprehensive 13-step system for competitor analysis and professional SEO content writing powered by Google Gemini AI",
  keywords: ["SEO", "content writing", "competitor analysis", "AI", "Google Gemini", "keyword research", "content optimization"],
  authors: [{ name: "SEO Content System" }],
  openGraph: {
    title: "SEO Content Writing System",
    description: "13-step AI-powered SEO content writing system with competitor analysis, entity extraction, and content optimization",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${ibmPlexArabic.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster position="bottom-left" dir="rtl" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
