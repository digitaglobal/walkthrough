import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Townhouse Type A | Ground Floor Walkthrough",
  description: "Explore the completed ground floor in 3D.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
