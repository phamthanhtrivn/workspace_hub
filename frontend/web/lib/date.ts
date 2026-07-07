export function formatConversationTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // 1. Dưới 1 giờ -> Hiển thị phút
  if (diffInMinutes < 60) {
    if (diffInMinutes < 1) return "Vừa xong";
    return `${diffInMinutes} phút`;
  }
  
  // 2. Dưới 24 giờ -> Hiển thị giờ
  if (diffInHours < 24) {
    return `${diffInHours} giờ`;
  }
  
  // 3. Quá 1 ngày nhưng dưới 7 ngày -> Hiển thị số ngày
  if (diffInDays < 7) {
    return `${diffInDays} ngày`;
  }
  
  // 4. Quá 1 tuần -> Kiểm tra xem có cùng năm không
  const isSameYear = date.getFullYear() === now.getFullYear();
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  if (isSameYear) {
    return `${day}/${month}`;
  } else {
    return `${day}/${month}/${year}`;
  }
}

export const formatTimeAgo = formatConversationTime;
