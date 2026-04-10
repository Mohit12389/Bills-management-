"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { Store, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Store className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-base font-bold">MithaiBills</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
