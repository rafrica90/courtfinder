"use client";

import Link from "next/link";
import { User as LucideUser } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountMenu() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Link
      href="/account"
      aria-label="Account"
      className="p-2 rounded-lg hover:bg-white/10 text-[#b8c5d6] hover:text-[#00d9ff]"
    >
      <LucideUser className="h-5 w-5" />
    </Link>
  );
}


