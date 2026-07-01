"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarRange, Copy, Edit3, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { demoHost } from "@/lib/mock/data";

export default function EventTypesList() {
  const [q, setQ] = useState("");
  const [empty, setEmpty] = useState(false);
  const list = demoHost.eventTypes.filter((e) =>
    e.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <DashboardTopbar
        title="Event types"
        description="Bookable meeting configurations you share via links."
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={empty} onCheckedChange={setEmpty} />
              Preview empty state
            </label>
            <Button asChild>
              <Link href="/dashboard/event-types/new">
                <Plus className="mr-1 h-4 w-4" /> New event type
              </Link>
            </Button>
          </div>
        }
      />
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {empty ? (
          <EmptyEventTypes />
        ) : (
          <div className="grid gap-4 fade-in">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search event types"
              className="max-w-sm"
            />
            <ul className="grid gap-3">
              {list.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border bg-surface p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            "inline-block h-2 w-2 rounded-full " +
                            (e.active ? "bg-primary" : "bg-muted-foreground/40")
                          }
                        />
                        <h3 className="text-base font-medium">{e.title}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {e.duration} min
                        </span>
                        {!e.active ? (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            Inactive
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        <span className="font-mono">syncslot.app/{demoHost.username}/{e.slug}</span>
                        {" · "}Schedule: {e.scheduleName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/event-types/${e.id}`}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {e.active ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}

function EmptyEventTypes() {
  return (
    <EmptyState
      icon={CalendarRange}
      title="No event types yet"
      description="Event types are the meeting configurations you share. Create one to get started."
      action={
        <Button asChild>
          <Link href="/dashboard/event-types/new">
            <Plus className="mr-1 h-4 w-4" /> Create your first event type
          </Link>
        </Button>
      }
    />
  );
}
