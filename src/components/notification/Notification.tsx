import notificationEnum from "./notification.enum.js";

interface NotificationProps {
  type: string;
  content: string;
  description: string;
}

export default function Notification({
  type,
  content,
  description,
}: NotificationProps) {
  return (
    <div className={`noti bg-white p-3 rounded-lg shadow-lg ${type}`}>
      <div className="noti_line"></div>
      <h3 className="text-lg font-bold">{content}</h3>
      <p className="text-sm text-gray-400 noti_desc">{description}</p>
    </div>
  );
}
