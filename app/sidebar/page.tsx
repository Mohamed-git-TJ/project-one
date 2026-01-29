'use client'
import { Calendar, Home, CircleDollarSignIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SignInButton, UserButton } from '@clerk/nextjs'
import { Authenticated, Unauthenticated } from "convex/react"



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
  
]

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

  
]


export function MainSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>GTD</SidebarGroupLabel>
          <SidebarGroupContent>
            <Authenticated>
              <SidebarMenu>
              {authItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                  
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            </Unauthenticated>
  
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
        <SidebarFooter>

            <SidebarMenuButton>
             <Authenticated><UserButton /> </Authenticated>
             <Unauthenticated><SignInButton/></Unauthenticated>
             
                </SidebarMenuButton>

        </SidebarFooter>
    </Sidebar>
  )
}