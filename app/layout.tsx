import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeadGen Portal",
  description: "Schema-driven lead extraction portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#080810" }}>{children}</body>
    </html>
  );
}
