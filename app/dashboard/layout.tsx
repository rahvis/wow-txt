"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone, FileText, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { icon: Phone, label: "Call", href: "/dashboard" },
    { icon: FileText, label: "Transcript", href: "/dashboard/transcript" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`bg-white ${
          isOpen ? "w-64" : "w-20"
        } transition-all duration-300 ease-in-out`}
      >
        <nav className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4">
            <div
              className={`${
                isOpen ? "w-40" : "w-12"
              } transition-all duration-300 ease-in-out overflow-hidden`}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-default-lISCFjk1Lzg1UjKfKOxZbbnhieuesw.webp"
                alt="WorkOnward Logo"
                width={160}
                height={32}
                priority
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "<" : ">"}
            </Button>
          </div>
          <ul className="flex-1 space-y-2 p-4">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} passHref>
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {isOpen && <span>{item.label}</span>}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
          <div className="p-4">
            <Link href="/" passHref>
              <Button variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                {isOpen && <span>Logout</span>}
              </Button>
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
