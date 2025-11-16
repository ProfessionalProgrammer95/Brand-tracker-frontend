// app/ar/layout.tsx
import { ReactNode } from "react";

export default function ARLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-24"
      style={{
        overflow: "hidden",
        margin: 0,
        padding: 0,
        marginTop: "20%",
      }}
    >
      {children}
    </div>
  );
}

export const metadata = {
  title: "Brand Galaxy AR",
};

export const viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
