import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
