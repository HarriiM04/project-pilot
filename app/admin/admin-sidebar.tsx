'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { BrandLockup, BrandMark } from '@/components/brand-logo'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/projects', label: 'All Projects', icon: FolderKanban,  exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar transition-[width] duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Brand */}
      <Link href="/admin"
        className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 hover:opacity-80 transition-opacity">
        {collapsed
          ? <BrandMark className="size-8 shrink-0" />
          : <BrandLockup textSize="text-sm" variant="auto" />
        }
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0',
                active
                  ? 'text-white shadow-md'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)',
              } : {}}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground',
            'transition-all hover:bg-sidebar-accent hover:text-foreground cursor-pointer',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
