export const isAudioFile = (media: any): boolean => {
  if (!media) return false;
  return (
    media.mimeType?.startsWith("audio/") ||
    media.name?.endsWith(".webm") ||
    media.name?.endsWith(".mp3") ||
    media.name?.endsWith(".m4a")
  );
};

export const renderAudioPlayer = (media: any, isMe: boolean) => {
  return (
    <div
      key={media.id}
      className={`p-2 rounded-2xl ${isMe ? "bg-[#DBEAFE]" : "bg-gray-100"}`}
    >
      <audio controls src={media.fileUrl} className="h-10 max-w-[240px]" />
    </div>
  );
};
