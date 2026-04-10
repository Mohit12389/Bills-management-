"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Receipt,
  BarChart3,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/bills/new", label: "Add", icon: Plus, isAction: true },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      <div className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center py-2"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-nav-item", isActive && "active")}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
