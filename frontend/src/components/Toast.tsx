import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

type Props = {
  message: string;
  type?: ToastType;
  onClose: () => void;
};

export default function Toast({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    // 2秒後自動消失
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <AlertCircle className="text-blue-500" size={20} />,
  };

  const bgStyles = {
    success: 'bg-white border-l-4 border-green-500',
    error: 'bg-white border-l-4 border-red-500',
    info: 'bg-white border-l-4 border-blue-500',
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${bgStyles[type]}`}>
        {icons[type]}
        <span className="font-bold text-gray-800">{message}</span>
      </div>
    </div>
  );
}