import { AlertTriangle } from 'lucide-react';

type Props = {
  isOpen: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ isOpen, title, content, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 animate-in zoom-in-95 scale-100 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
             <AlertTriangle size={24} />
          </div>
          
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{content}</p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-colors shadow-lg shadow-gray-200"
            >
              確認 +1
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}