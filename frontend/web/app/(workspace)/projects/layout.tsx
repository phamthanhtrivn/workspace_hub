import ProjectRealtimeManager from "@/features/project/components/project-realtime-manager";

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <ProjectRealtimeManager />
    </>
  );
}
