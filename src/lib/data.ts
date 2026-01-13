export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
    id: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    date: string;
}

export type UserRole = 'user' | 'vip';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    vipStatus?: UserStatus; // Only relevant if requesting VIP or is VIP
    joinedDate: string;
}

export const MOCK_ORDERS: Order[] = [
    {
        id: 'ORD-001',
        customerName: 'Alice Johnson',
        total: 120.50,
        status: 'completed',
        date: '2023-10-25',
    },
    {
        id: 'ORD-002',
        customerName: 'Bob Smith',
        total: 75.00,
        status: 'processing',
        date: '2023-10-26',
    },
    {
        id: 'ORD-003',
        customerName: 'Charlie Davis',
        total: 450.00,
        status: 'pending',
        date: '2023-10-27',
    },
    {
        id: 'ORD-004',
        customerName: 'Diana Evans',
        total: 35.25,
        status: 'cancelled',
        date: '2023-10-24',
    },
    {
        id: 'ORD-005',
        customerName: 'Evan Wright',
        total: 210.00,
        status: 'completed',
        date: '2023-10-28',
    },
];

export const MOCK_USERS: User[] = [
    {
        id: 'USR-001',
        name: 'Frank Miller',
        email: 'frank@example.com',
        role: 'user',
        joinedDate: '2023-09-15',
    },
    {
        id: 'USR-002',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        role: 'vip',
        vipStatus: 'approved',
        joinedDate: '2023-08-01',
    },
    {
        id: 'USR-003',
        name: 'Henry Ford',
        email: 'henry@example.com',
        role: 'user',
        vipStatus: 'pending', // Requesting VIP
        joinedDate: '2023-10-10',
    },
    {
        id: 'USR-004',
        name: 'Ivy Baker',
        email: 'ivy@example.com',
        role: 'user',
        vipStatus: 'pending', // Requesting VIP
        joinedDate: '2023-10-20',
    },
    {
        id: 'USR-005',
        name: 'Jack Daniels',
        email: 'jack@example.com',
        role: 'vip',
        vipStatus: 'approved',
        joinedDate: '2023-07-22',
    },
];
