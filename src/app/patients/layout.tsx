'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
