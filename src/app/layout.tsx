import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Townhouse Type A | Three-Level Walkthrough",
  description: "Explore the ground floor, first floor, and roof terrace in an interactive 3D walkthrough.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
