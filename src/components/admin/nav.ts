import {
  Boxes,
  CreditCard,
  FileText,
  FolderTree,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  Settings,
  UserCog,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { AdminArea } from "@/lib/admin/permissions";

export interface AdminNavItem {
  label: string;
  href: string;
  area: AdminArea;
  icon: LucideIcon;
}

export const ADMIN_NAV: { heading?: string; items: AdminNavItem[] }[] = [
  { items: [{ label: "Dashboard", href: "/admin", area: "dashboard", icon: LayoutDashboard }] },
  {
    heading: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", area: "orders", icon: ShoppingCart },
      { label: "Checkout", href: "/admin/checkout", area: "settings", icon: CreditCard },
      { label: "Customers", href: "/admin/customers", area: "customers", icon: Users },
      { label: "Messages", href: "/admin/messages", area: "messages", icon: Mail },
    ],
  },
  {
    heading: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", area: "products", icon: Boxes },
      { label: "Categories", href: "/admin/categories", area: "categories", icon: FolderTree },
      { label: "Media", href: "/admin/media", area: "media", icon: ImageIcon },
    ],
  },
  {
    heading: "Website",
    items: [
      { label: "Content", href: "/admin/content", area: "content", icon: FileText },
      { label: "Marketing", href: "/admin/marketing", area: "marketing", icon: Megaphone },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Settings", href: "/admin/settings", area: "settings", icon: Settings },
      { label: "My account", href: "/admin/account", area: "account", icon: UserCog },
      { label: "Activity", href: "/admin/activity", area: "activity", icon: History },
    ],
  },
];
