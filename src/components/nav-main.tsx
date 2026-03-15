"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { isMobile, state } = useSidebar()
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase py-4">
        Điều hướng chính
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const isMainActive = item.url === pathname || item.items?.some(sub => sub.url === pathname)

          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu 
                  open={openDropdown === item.title}
                  onOpenChange={(open) => {
                    setOpenDropdown(open ? item.title : null)
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className={`transition-all duration-300 ${isMainActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"}`}
                    >
                      {item.icon && <item.icon className="size-4" />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="min-w-48 rounded-xl bg-background/80 backdrop-blur-xl border-border/40 shadow-premium"
                    side="right"
                    align="start"
                    sideOffset={12}
                  >
                    <DropdownMenuLabel className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 p-3">
                      {item.icon && <item.icon className="h-3.5 w-3.5" />}
                      {item.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border/40" />
                    {item.items?.map((subItem) => {
                      const isActive = pathname === subItem.url
                      return (
                        <DropdownMenuItem 
                          key={subItem.title} 
                          asChild
                          onSelect={() => setOpenDropdown(null)}
                          className={`m-1 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
                        >
                          <Link href={subItem.url} className="text-xs font-medium py-2 px-3">
                            {subItem.title}
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          }

          // Direct link (no sub-items)
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  className={`h-11 transition-all duration-300 ${isMainActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"}`}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon className="size-4" />}
                    <span className="text-xs font-bold tracking-wider">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || isMainActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    className={`h-11 transition-all duration-300 ${isMainActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"}`}
                  >
                    {item.icon && <item.icon className="size-4" />}
                    <span className="text-xs font-bold tracking-wider">{item.title}</span>
                    <ChevronRight className="ml-auto size-3.5 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90 opacity-40" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-l-0 ml-4 pl-4 border-l border-border/20 gap-1 mt-1">
                    {item.items?.map((subItem) => {
                      const isActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isActive}
                            className={`h-9 transition-all duration-300 rounded-lg px-4 ${isActive ? "bg-primary/10 text-primary font-bold shadow-[inset_0_0_0_1px_oklch(var(--primary)/0.2)]" : "text-muted-foreground/70 hover:text-foreground hover:bg-primary/5"}`}
                          >
                            <Link href={subItem.url}>
                              <span className="text-[11px] uppercase tracking-widest">{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
