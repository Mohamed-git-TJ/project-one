"use client";

import {
  Calendar,
  Home,
  CircleDollarSignIcon,
  CheckSquare,
  LogIn,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const authItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Calendar / Tickler File", url: "/calendarTickler", icon: Calendar },
];
const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Pricing", url: "/pricing", icon: CircleDollarSignIcon },
];

export function MainSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const expanded = isMobile || state === "expanded";
  const renderMenu = (entries: typeof authItems) => (
    <SidebarMenu className="gap-1.5">
      {entries.map((item) => {
        const active =
          item.url === "/"
            ? pathname === "/"
            : pathname === item.url || pathname.startsWith(item.url + "/");
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.title}
              className="h-10 rounded-lg px-3 text-zinc-400 hover:bg-[#282a2c] hover:text-white data-[active=true]:bg-[#303236] data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-white/10"
            >
              <Link
                href={item.url}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <item.icon className="shrink-0" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-4">
        <div
          className={`flex items-center gap-2 ${expanded ? "justify-between px-1" : "justify-center"}`}
        >
          {expanded && (
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-600 bg-gradient-to-br from-zinc-700 to-zinc-800 text-white">
                <CheckSquare className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold tracking-tight text-white">
                  MoGTD
                </span>
                <span className="block text-[10px] text-zinc-400">
                  Personal workspace
                </span>
              </span>
            </Link>
          )}
          <SidebarTrigger className="shrink-0 rounded-lg text-zinc-400 hover:bg-zinc-700 hover:text-white" />
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          {expanded && (
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Workspace
            </div>
          )}
          <SidebarGroupContent>
            <Authenticated>{renderMenu(authItems)}</Authenticated>
            <Unauthenticated>{renderMenu(items)}</Unauthenticated>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border py-3">
        <Authenticated>
          <div
            className={`flex items-center gap-3 rounded-lg ${expanded ? "bg-[#222426] px-3 py-3" : "justify-center py-1"}`}
          >
            <UserButton />
            {expanded && (
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">
                  My account
                </div>
                <div className="text-xs text-zinc-400">Manage profile</div>
              </div>
            )}
          </div>
        </Authenticated>
        <Unauthenticated>
          <SignInButton>
            <button
              type="button"
              aria-label="Sign in"
              className={`flex items-center gap-2 rounded-lg bg-[#282a2c] p-2 text-sm text-white hover:bg-zinc-700 ${expanded ? "justify-center" : "justify-center"}`}
            >
              <LogIn className="size-4 shrink-0" />
              {expanded && <span>Sign in</span>}
            </button>
          </SignInButton>
        </Unauthenticated>
      </SidebarFooter>
    </Sidebar>
  );
}
