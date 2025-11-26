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

// Product interface and mock data
export interface Product {
  id: string;
  productCode: string;
  productName: string;
  optionName: string;
  manufacturerId: string | null;
  manufacturerName: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export const products: Product[] = [
  {
    id: "p1",
    productCode: "NS-001",
    productName: "신라면 멀티팩",
    optionName: "5개입",
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    price: 7900,
    createdAt: "2024-01-15T10:00:00",
    updatedAt: "2024-11-20T14:30:00",
  },
  {
    id: "p2",
    productCode: "NS-002",
    productName: "안성탕면",
    optionName: "5개입",
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    price: 6500,
    createdAt: "2024-01-15T10:00:00",
    updatedAt: "2024-11-20T14:30:00",
  },
  {
    id: "p3",
    productCode: "CJ-101",
    productName: "햇반 210g",
    optionName: "12개입",
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    price: 15800,
    createdAt: "2024-02-10T09:00:00",
    updatedAt: "2024-11-18T11:00:00",
  },
  {
    id: "p4",
    productCode: "CJ-102",
    productName: "비비고 만두",
    optionName: "1kg",
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    price: 12900,
    createdAt: "2024-02-10T09:00:00",
    updatedAt: "2024-11-18T11:00:00",
  },
  {
    id: "p5",
    productCode: "OT-201",
    productName: "진라면 순한맛",
    optionName: "5개입",
    manufacturerId: "m3",
    manufacturerName: "오뚜기",
    price: 4500,
    createdAt: "2024-03-05T14:00:00",
    updatedAt: "2024-11-15T09:00:00",
  },
  {
    id: "p6",
    productCode: "OT-202",
    productName: "오뚜기 카레",
    optionName: "100g",
    manufacturerId: "m3",
    manufacturerName: "오뚜기",
    price: 2500,
    createdAt: "2024-03-05T14:00:00",
    updatedAt: "2024-11-15T09:00:00",
  },
  {
    id: "p7",
    productCode: "DW-301",
    productName: "동원참치 라이트",
    optionName: "150g 4캔",
    manufacturerId: "m4",
    manufacturerName: "동원F&B",
    price: 12900,
    createdAt: "2024-04-20T11:00:00",
    updatedAt: "2024-11-22T16:00:00",
  },
  {
    id: "p8",
    productCode: "PM-401",
    productName: "풀무원 두부",
    optionName: "300g",
    manufacturerId: "m5",
    manufacturerName: "풀무원",
    price: 2800,
    createdAt: "2024-05-12T08:00:00",
    updatedAt: "2024-11-10T13:00:00",
  },
  {
    id: "p9",
    productCode: "PM-402",
    productName: "풀무원 콩나물",
    optionName: "200g",
    manufacturerId: "m5",
    manufacturerName: "풀무원",
    price: 1500,
    createdAt: "2024-05-12T08:00:00",
    updatedAt: "2024-11-10T13:00:00",
  },
  {
    id: "p10",
    productCode: "UNKNOWN-001",
    productName: "미등록 상품 A",
    optionName: "기본",
    manufacturerId: null,
    manufacturerName: null,
    price: 5000,
    createdAt: "2024-11-25T10:00:00",
    updatedAt: "2024-11-25T10:00:00",
  },
  {
    id: "p11",
    productCode: "UNKNOWN-002",
    productName: "미등록 상품 B",
    optionName: "기본",
    manufacturerId: null,
    manufacturerName: null,
    price: 8000,
    createdAt: "2024-11-25T11:00:00",
    updatedAt: "2024-11-25T11:00:00",
  },
  {
    id: "p12",
    productCode: "UNKNOWN-003",
    productName: "미등록 상품 C",
    optionName: "대용량",
    manufacturerId: null,
    manufacturerName: null,
    price: 15000,
    createdAt: "2024-11-26T09:00:00",
    updatedAt: "2024-11-26T09:00:00",
  },
  {
    id: "p13",
    productCode: "NS-003",
    productName: "너구리",
    optionName: "5개입",
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    price: 6800,
    createdAt: "2024-06-01T10:00:00",
    updatedAt: "2024-11-20T14:30:00",
  },
  {
    id: "p14",
    productCode: "CJ-103",
    productName: "스팸 클래식",
    optionName: "200g",
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    price: 5900,
    createdAt: "2024-06-15T09:00:00",
    updatedAt: "2024-11-18T11:00:00",
  },
  {
    id: "p15",
    productCode: "DW-302",
    productName: "동원 리챔",
    optionName: "200g",
    manufacturerId: "m4",
    manufacturerName: "동원F&B",
    price: 4500,
    createdAt: "2024-07-10T11:00:00",
    updatedAt: "2024-11-22T16:00:00",
  },
];

// Send Log interface and mock data
export interface SendLog {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  email: string;
  subject: string;
  fileName: string;
  orderCount: number;
  totalAmount: number;
  status: "success" | "failed" | "pending";
  errorMessage?: string;
  sentAt: string;
  sentBy: string;
}

export const sendLogs: SendLog[] = [
  {
    id: "log1",
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    email: "kim@nongshim.com",
    subject: "[다온에프앤씨 발주서]_농심식품_20241126",
    fileName: "[다온에프앤씨 발주서]_농심식품_20241126.xlsx",
    orderCount: 45,
    totalAmount: 892000,
    status: "success",
    sentAt: "2024-11-26T11:30:00",
    sentBy: "관리자",
  },
  {
    id: "log2",
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    email: "park@cj.net",
    subject: "[다온에프앤씨 발주서]_CJ제일제당_20241126",
    fileName: "[다온에프앤씨 발주서]_CJ제일제당_20241126.xlsx",
    orderCount: 38,
    totalAmount: 756000,
    status: "success",
    sentAt: "2024-11-26T11:32:00",
    sentBy: "관리자",
  },
  {
    id: "log3",
    manufacturerId: "m3",
    manufacturerName: "오뚜기",
    email: "lee@ottogi.co.kr",
    subject: "[다온에프앤씨 발주서]_오뚜기_20241126",
    fileName: "[다온에프앤씨 발주서]_오뚜기_20241126.xlsx",
    orderCount: 32,
    totalAmount: 584000,
    status: "success",
    sentAt: "2024-11-26T11:35:00",
    sentBy: "관리자",
  },
  {
    id: "log4",
    manufacturerId: "m4",
    manufacturerName: "동원F&B",
    email: "jung@dongwon.com",
    subject: "[다온에프앤씨 발주서]_동원F&B_20241125",
    fileName: "[다온에프앤씨 발주서]_동원F&B_20241125.xlsx",
    orderCount: 25,
    totalAmount: 498000,
    status: "failed",
    errorMessage: "SMTP 연결 실패: 서버 응답 없음",
    sentAt: "2024-11-25T10:15:00",
    sentBy: "관리자",
  },
  {
    id: "log5",
    manufacturerId: "m5",
    manufacturerName: "풀무원",
    email: "choi@pulmuone.co.kr",
    subject: "[다온에프앤씨 발주서]_풀무원_20241125",
    fileName: "[다온에프앤씨 발주서]_풀무원_20241125.xlsx",
    orderCount: 16,
    totalAmount: 312000,
    status: "success",
    sentAt: "2024-11-25T10:20:00",
    sentBy: "관리자",
  },
  {
    id: "log6",
    manufacturerId: "m1",
    manufacturerName: "농심식품",
    email: "kim@nongshim.com",
    subject: "[다온에프앤씨 발주서]_농심식품_20241125",
    fileName: "[다온에프앤씨 발주서]_농심식품_20241125.xlsx",
    orderCount: 52,
    totalAmount: 1024000,
    status: "success",
    sentAt: "2024-11-25T10:10:00",
    sentBy: "관리자",
  },
  {
    id: "log7",
    manufacturerId: "m2",
    manufacturerName: "CJ제일제당",
    email: "park@cj.net",
    subject: "[다온에프앤씨 발주서]_CJ제일제당_20241124",
    fileName: "[다온에프앤씨 발주서]_CJ제일제당_20241124.xlsx",
    orderCount: 41,
    totalAmount: 820000,
    status: "success",
    sentAt: "2024-11-24T11:00:00",
    sentBy: "관리자",
  },
  {
    id: "log8",
    manufacturerId: "m3",
    manufacturerName: "오뚜기",
    email: "invalid-email",
    subject: "[다온에프앤씨 발주서]_오뚜기_20241124",
    fileName: "[다온에프앤씨 발주서]_오뚜기_20241124.xlsx",
    orderCount: 28,
    totalAmount: 456000,
    status: "failed",
    errorMessage: "잘못된 이메일 주소 형식",
    sentAt: "2024-11-24T10:45:00",
    sentBy: "관리자",
  },
  {
    id: "log9",
    manufacturerId: "m4",
    manufacturerName: "동원F&B",
    email: "jung@dongwon.com",
    subject: "[다온에프앤씨 발주서]_동원F&B_20241124",
    fileName: "[다온에프앤씨 발주서]_동원F&B_20241124.xlsx",
    orderCount: 19,
    totalAmount: 380000,
    status: "success",
    sentAt: "2024-11-24T10:30:00",
    sentBy: "관리자",
  },
  {
    id: "log10",
    manufacturerId: "m5",
    manufacturerName: "풀무원",
    email: "choi@pulmuone.co.kr",
    subject: "[다온에프앤씨 발주서]_풀무원_20241123",
    fileName: "[다온에프앤씨 발주서]_풀무원_20241123.xlsx",
    orderCount: 14,
    totalAmount: 280000,
    status: "success",
    sentAt: "2024-11-23T09:45:00",
    sentBy: "관리자",
  },
];

// SMTP Settings interface
export interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  fromName: string;
  fromEmail: string;
}

export const smtpSettings: SMTPSettings = {
  host: "smtp.gmail.com",
  port: 587,
  username: "daonfnc@gmail.com",
  password: "",
  secure: true,
  fromName: "(주)다온에프앤씨",
  fromEmail: "daonfnc@gmail.com",
};

