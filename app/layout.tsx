import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pro Voice Reader",
  description: "Convert written text to professional-sounding speech in your browser."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
