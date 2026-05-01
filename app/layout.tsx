import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--zip-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--zip-serif",
})

export const metadata: Metadata = {
  title: "Florence Library",
  description: "A digital library reader interface.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
