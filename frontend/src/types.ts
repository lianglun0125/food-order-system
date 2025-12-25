export type ItemOption = { name: string; price: number };
export type ExtraOption = { n: string; p: number };

export type MenuItem = { 
  n: string; 
  p: number; 
  is_drink: boolean; 
  spicy?: boolean; 
  description?: string; 
  options: ItemOption[]; 
  choices?: string[]; 
};

export type Category = { name: string; items: MenuItem[]; };

export type Order = {
  id: number;
  user_name: string;
  items_json: string;
  total_price: number;
  created_at: number;
  is_paid: number;
  user_token?: string;
};

// 房間資訊的回傳結構
export type RoomInfo = {
  id: string;
  joinCode: string;
  status: 'OPEN' | 'LOCKED' | 'DELETED';
  deadline: number | null;
  extra_fee: number;
  has_payment_qr: boolean;
  menu: {
    categories: Category[];
    global_extras?: ExtraOption[];
    items?: MenuItem[]; // 兼容舊格式
  };
};