// Mock data for the Shabangnet Order Automation System

export interface Manufacturer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  ccEmail?: string;
  phone: string;
  orderCount: number;
  lastOrderDate: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  productCode: string;
  productName: string;
  optionName: string;
  quantity: number;
  price: number;
  manufacturerId: string;
  manufacturerName: string;
  status: "pending" | "processing" | "completed" | "error";
  createdAt: string;
}

export interface Upload {
  id: string;
  fileName: string;
  fileSize: number;
  totalOrders: number;
  processedOrders: number;
  errorOrders: number;
  uploadedAt: string;
  status: "processing" | "completed" | "error";
}

export interface DashboardStats {
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  errorOrders: number;
  todayOrdersChange: number;
  pendingOrdersChange: number;
  completedOrdersChange: number;
  errorOrdersChange: number;
}

// Mock manufacturers
export const manufacturers: Manufacturer[] = [
  {
    id: "m1",
    name: "농심식품",
    contactName: "김영희",
    email: "kim@nongshim.com",
    ccEmail: "order@nongshim.com",
    phone: "02-1234-5678",
    orderCount: 156,
    lastOrderDate: "2024-11-26",
  },
  {
    id: "m2",
    name: "CJ제일제당",
    contactName: "박철수",
    email: "park@cj.net",
    phone: "02-2345-6789",
    orderCount: 234,
    lastOrderDate: "2024-11-26",
  },
  {
    id: "m3",
    name: "오뚜기",
    contactName: "이미영",
    email: "lee@ottogi.co.kr",
    ccEmail: "supply@ottogi.co.kr",
    phone: "02-3456-7890",
    orderCount: 189,
    lastOrderDate: "2024-11-25",
  },
  {
    id: "m4",
    name: "동원F&B",
    contactName: "정대현",
    email: "jung@dongwon.com",
    phone: "02-4567-8901",
    orderCount: 98,
    lastOrderDate: "2024-11-26",
  },
  {
    id: "m5",
    name: "풀무원",
    contactName: "최수진",
    email: "choi@pulmuone.co.kr",
    phone: "02-5678-9012",
    orderCount: 145,
    lastOrderDate: "2024-11-24",
  },
];

// Mock orders
export const orders: Order[] = [
  {
    id: "o1",
    orderNumber: "SB20241126001",
    customerName: "홍길동",
    phone: "010-1234-5678",
    address: "서울시 강남구 테헤란로 123",
    productCode: "NS-001",
    productName: "신라면 멀티팩",
    optionName: "5개입",
    quantity: 2,
    price: 7900,
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    status: "pending",
    createdAt: "2024-11-26T09:30:00",
  },
  {
    id: "o2",
    orderNumber: "SB20241126002",
    customerName: "김철수",
    phone: "010-2345-6789",
    address: "경기도 성남시 분당구 판교로 456",
    productCode: "CJ-101",
    productName: "햇반 210g",
    optionName: "12개입",
    quantity: 1,
    price: 15800,
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    status: "pending",
    createdAt: "2024-11-26T09:45:00",
  },
  {
    id: "o3",
    orderNumber: "SB20241126003",
    customerName: "이영희",
    phone: "010-3456-7890",
    address: "인천시 연수구 송도대로 789",
    productCode: "OT-201",
    productName: "진라면 순한맛",
    optionName: "5개입",
    quantity: 3,
    price: 4500,
    manufacturerId: "m3",
    manufacturerName: "오뚜기",
    status: "completed",
    createdAt: "2024-11-26T10:00:00",
  },
  {
    id: "o4",
    orderNumber: "SB20241126004",
    customerName: "박민수",
    phone: "010-4567-8901",
    address: "부산시 해운대구 해운대로 101",
    productCode: "DW-301",
    productName: "동원참치 라이트",
    optionName: "150g 4캔",
    quantity: 2,
    price: 12900,
    manufacturerId: "m4",
    manufacturerName: "동원F&B",
    status: "processing",
    createdAt: "2024-11-26T10:15:00",
  },
  {
    id: "o5",
    orderNumber: "SB20241126005",
    customerName: "정수연",
    phone: "010-5678-9012",
    address: "대전시 유성구 대학로 202",
    productCode: "PM-401",
    productName: "풀무원 두부",
    optionName: "300g",
    quantity: 4,
    price: 2800,
    manufacturerId: "m5",
    manufacturerName: "풀무원",
    status: "error",
    createdAt: "2024-11-26T10:30:00",
  },
];

// Mock recent uploads
export const recentUploads: Upload[] = [
  {
    id: "u1",
    fileName: "사방넷_주문내역_20241126.xlsx",
    fileSize: 245760,
    totalOrders: 156,
    processedOrders: 152,
    errorOrders: 4,
    uploadedAt: "2024-11-26T09:00:00",
    status: "completed",
  },
  {
    id: "u2",
    fileName: "사방넷_주문내역_20241125.xlsx",
    fileSize: 198540,
    totalOrders: 128,
    processedOrders: 128,
    errorOrders: 0,
    uploadedAt: "2024-11-25T09:15:00",
    status: "completed",
  },
  {
    id: "u3",
    fileName: "사방넷_주문내역_20241124.xlsx",
    fileSize: 312890,
    totalOrders: 203,
    processedOrders: 198,
    errorOrders: 5,
    uploadedAt: "2024-11-24T08:45:00",
    status: "completed",
  },
];

// Dashboard stats
export const dashboardStats: DashboardStats = {
  todayOrders: 156,
  pendingOrders: 42,
  completedOrders: 110,
  errorOrders: 4,
  todayOrdersChange: 12.5,
  pendingOrdersChange: -8.2,
  completedOrdersChange: 23.1,
  errorOrdersChange: -33.3,
};

// Chart data for manufacturer orders
export const manufacturerChartData = [
  { name: "농심식품", orders: 45, amount: 892000 },
  { name: "CJ제일제당", orders: 38, amount: 756000 },
  { name: "오뚜기", orders: 32, amount: 584000 },
  { name: "동원F&B", orders: 25, amount: 498000 },
  { name: "풀무원", orders: 16, amount: 312000 },
];

// Order status for batch processing
export interface OrderBatch {
  manufacturerId: string;
  manufacturerName: string;
  orders: Order[];
  totalOrders: number;
  totalAmount: number;
  status: "pending" | "ready" | "sent" | "error";
  email: string;
  lastSentAt?: string;
}

export const orderBatches: OrderBatch[] = manufacturers.map((m) => {
  const mOrders = orders.filter((o) => o.manufacturerId === m.id);
  return {
    manufacturerId: m.id,
    manufacturerName: m.name,
    orders: mOrders,
    totalOrders: mOrders.length,
    totalAmount: mOrders.reduce((sum, o) => sum + o.price * o.quantity, 0),
    status: mOrders.some((o) => o.status === "error")
      ? "error"
      : mOrders.every((o) => o.status === "completed")
      ? "sent"
      : "pending",
    email: m.email,
    lastSentAt:
      mOrders.every((o) => o.status === "completed")
        ? "2024-11-26T11:30:00"
        : undefined,
  };
});

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getStatusColor(
  status: "pending" | "processing" | "completed" | "error" | "ready" | "sent"
): string {
  const colors = {
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    ready: "bg-emerald-100 text-emerald-800",
    completed: "bg-emerald-100 text-emerald-800",
    sent: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-800",
  };
  return colors[status] || colors.pending;
}

export function getStatusLabel(
  status: "pending" | "processing" | "completed" | "error" | "ready" | "sent"
): string {
  const labels = {
    pending: "대기중",
    processing: "처리중",
    ready: "발송대기",
    completed: "완료",
    sent: "발송완료",
    error: "오류",
  };
  return labels[status] || status;
}

