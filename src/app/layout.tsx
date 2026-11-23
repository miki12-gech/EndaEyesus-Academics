import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "እንዳ ኢየሱስ ግቢ ጉባኤ | የአካዳሚክ ፖርታል",
  description:
    "የእንዳ ኢየሱስ ግቢ ጉባኤ ነባር ተማሪዎችና አገልጋዮች የትምህርት ሁኔታ መመዝገቢያና የድጋፍ ፖርታል",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-ethiopic bg-gibi-light text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
