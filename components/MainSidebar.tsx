"use client";
import { Calendar, Home, CircleDollarSignIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";

// Authorised items.
const authItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Calendar / Tickler File",
    url: "/calendarTickler",
    icon: Calendar,
  },
];

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },

  {
    title: "Pricing",
    url: "/pricing",
    icon: CircleDollarSignIcon,
  },
];

export function MainSidebar() {
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-2">
        <div
          className={`flex items-center ${
            state === "collapsed" ? "justify-center" : "justify-between"
          }`}
        >
          {state === "expanded" && (
            <span className="text-sm font-semibold whitespace-nowrap">
              MoGTD
            </span>
          )}

          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Authenticated>
              <SidebarMenu>
                {authItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </Authenticated>

            <Unauthenticated>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </Unauthenticated>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Authenticated>
          <SidebarMenuButton asChild>
            <UserButton />
          </SidebarMenuButton>
        </Authenticated>

        <Unauthenticated>
          <SidebarMenuButton asChild>
            <SignInButton />
          </SidebarMenuButton>
        </Unauthenticated>
      </SidebarFooter>
    </Sidebar>
  );
}
