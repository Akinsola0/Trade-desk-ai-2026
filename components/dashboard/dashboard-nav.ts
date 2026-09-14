import {
  Bell,
  CalendarDays,
  Clock,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const dashboardNav: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/requests", label: "Requests", icon: Bell },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/calls", label: "Call log", icon: PhoneCall },
  { href: "/dashboard/messages", label: "Confirmations", icon: MessageSquare },
  { href: "/dashboard/availability", label: "Working hours", icon: Clock },
  { href: "/dashboard/settings", label: "Business profile", icon: Settings },
];
