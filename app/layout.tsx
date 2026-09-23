import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./chance-design-tokens.css"
import "./chance-competitive-rich.css"
import "./chance-responsive.css"
import "./globals.css"
import "./chance-theme-fab.css"
import ClientInit from "./client-init"
import { Toaster } from "@/components/ui/toaster"
import FloatingFeedbackButton from "@/components/feedback/floating-feedback-button"
import GlobalThemeToggle from "@/components/global-theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ChanceUS",
  description: "Skill-based games where talent maps to tokens",
  icons: {
    icon: [{ url: "/chanceus-eagle.png", type: "image/png" }],
    apple: [{ url: "/chanceus-eagle.png", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7434250143961922"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className="chance-body font-sans antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientInit />
          {children}
          <GlobalThemeToggle />
          <Toaster />
          <FloatingFeedbackButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
