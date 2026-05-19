"use client";

import * as React from "react";
import {
  add,
  addMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns";
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusCircleIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface CalendarEvent {
  id: number;
  name: string;
  time: string;
  datetime: string;
  endDatetime?: string;
  description?: string;
  location?: string;
}

export interface CalendarData {
  day: Date;
  events: CalendarEvent[];
}

interface FullScreenCalendarProps {
  data: CalendarData[];
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];

export function FullScreenCalendar({ data }: FullScreenCalendarProps) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [selectedEvent, setSelectedEvent] =
    React.useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy")
  );
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  });

  const selectedDayEvents =
    data.find((date) => isSameDay(date.day, selectedDay))?.events ?? [];

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"));
    setSelectedDay(today);
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
              <h1 className="p-1 text-xs uppercase text-muted-foreground">
                {format(today, "MMM")}
              </h1>
              <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "MMMM, yyyy")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} -{" "}
                {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Button variant="outline" size="icon" className="hidden lg:flex">
            <SearchIcon size={16} strokeWidth={2} aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to previous month"
            >
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto"
              variant="outline"
            >
              Today
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to next month"
            >
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator
            orientation="horizontal"
            className="block w-full md:hidden"
          />

          <Button className="w-full gap-2 md:w-auto" asChild>
            <a
              href="https://outlook.live.com/calendar/0/view/month"
              target="_blank"
              rel="noreferrer"
            >
              <PlusCircleIcon size={16} strokeWidth={2} aria-hidden="true" />
              <span>Open Outlook</span>
            </a>
          </Button>
        </div>
      </div>

      <div className="lg:flex lg:flex-auto lg:flex-col">
        <div className="grid grid-cols-7 border text-center text-xs font-semibold leading-6 lg:flex-none">
          <div className="border-r py-2.5">Sun</div>
          <div className="border-r py-2.5">Mon</div>
          <div className="border-r py-2.5">Tue</div>
          <div className="border-r py-2.5">Wed</div>
          <div className="border-r py-2.5">Thu</div>
          <div className="border-r py-2.5">Fri</div>
          <div className="py-2.5">Sat</div>
        </div>

        <div className="flex text-xs leading-6 lg:flex-auto">
          <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-6">
            {days.map((day, dayIdx) =>
              !isDesktop ? (
                <button
                  onClick={() => setSelectedDay(day)}
                  key={dayIdx}
                  type="button"
                  className={cn(
                    isEqual(day, selectedDay) && "text-primary-foreground",
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      isSameMonth(day, firstDayCurrentMonth) &&
                      "text-foreground",
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) &&
                      "font-semibold",
                    "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10"
                  )}
                >
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-full",
                      isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "bg-primary text-primary-foreground",
                      isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  {data.filter((date) => isSameDay(date.day, day)).length >
                    0 && (
                    <EventDots
                      events={
                        data.find((date) => isSameDay(date.day, day))?.events ??
                        []
                      }
                    />
                  )}
                </button>
              ) : (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "bg-accent/50 text-muted-foreground",
                    "relative flex min-h-28 flex-col border-b border-r hover:bg-muted focus:z-10",
                    !isEqual(day, selectedDay) && "hover:bg-accent/75"
                  )}
                >
                  <header className="flex items-center justify-between p-2.5">
                    <button
                      type="button"
                      className={cn(
                        isEqual(day, selectedDay) && "text-primary-foreground",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          isSameMonth(day, firstDayCurrentMonth) &&
                          "text-foreground",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          !isSameMonth(day, firstDayCurrentMonth) &&
                          "text-muted-foreground",
                        isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "border-none bg-primary",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-foreground",
                        (isEqual(day, selectedDay) || isToday(day)) &&
                          "font-semibold",
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs hover:border"
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                  </header>
                  <div className="flex-1 p-2.5">
                    {data
                      .filter((event) => isSameDay(event.day, day))
                      .map((day) => (
                        <div key={day.day.toString()} className="space-y-1.5">
                          {day.events.slice(0, 1).map((event) => (
                            <button
                              type="button"
                              key={event.id}
                              onClick={(eventClick) => {
                                eventClick.stopPropagation();
                                handleEventClick(event);
                              }}
                              className="flex w-full flex-col items-start gap-1 rounded-lg border bg-muted/50 p-2 text-left text-xs leading-tight transition hover:border-primary/40 hover:bg-muted"
                            >
                              <p className="font-medium leading-none">
                                {event.name}
                              </p>
                              <p className="leading-none text-muted-foreground">
                                {event.time}
                              </p>
                            </button>
                          ))}
                          {day.events.length > 1 && (
                            <button
                              type="button"
                              onClick={(eventClick) => {
                                eventClick.stopPropagation();
                                setSelectedDay(day.day);
                              }}
                              className="text-left text-xs text-muted-foreground hover:text-foreground"
                            >
                              + {day.events.length - 1} more
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="isolate grid w-full grid-cols-7 grid-rows-6 border-x lg:hidden">
            {days.map((day, dayIdx) => (
              <button
                onClick={() => setSelectedDay(day)}
                key={dayIdx}
                type="button"
                className={cn(
                  isEqual(day, selectedDay) && "text-primary-foreground",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    isSameMonth(day, firstDayCurrentMonth) &&
                    "text-foreground",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayCurrentMonth) &&
                    "text-muted-foreground",
                  (isEqual(day, selectedDay) || isToday(day)) &&
                    "font-semibold",
                  "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-muted focus:z-10"
                )}
              >
                <time
                  dateTime={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "ml-auto flex size-6 items-center justify-center rounded-full",
                    isEqual(day, selectedDay) &&
                      isToday(day) &&
                      "bg-primary text-primary-foreground",
                    isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </time>
                {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                  <EventDots
                    events={
                      data.find((date) => isSameDay(date.day, day))?.events ??
                      []
                    }
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SelectedDayAgenda
        day={selectedDay}
        events={selectedDayEvents}
        onEventClick={handleEventClick}
      />

      <EventDetails
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
    </div>
  );
}

function EventDots({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="-mx-0.5 mt-auto flex flex-wrap-reverse">
      {events.map((event) => (
        <span
          key={event.id}
          className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground"
        />
      ))}
    </div>
  );
}

function SelectedDayAgenda({
  day,
  events,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="border-x border-b p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{format(day, "EEEE, MMMM d")}</p>
          <p className="text-xs text-muted-foreground">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No events scheduled for this day.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <button
              type="button"
              key={event.id}
              onClick={() => onEventClick(event)}
              className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-muted/60"
            >
              <p className="font-medium">{event.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{event.time}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventDetails({
  event,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.name}</DialogTitle>
              <DialogDescription>
                Review the event details or add it to Outlook.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>{event.time}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.description && (
                <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" asChild>
                <a
                  href="https://outlook.live.com/calendar/0/view/month"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  Open Outlook
                </a>
              </Button>
              <Button asChild>
                <a
                  href={getOutlookEventUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <CalendarPlusIcon className="mr-2 h-4 w-4" />
                  Add to Outlook
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getOutlookEventUrl(event: CalendarEvent) {
  const start = new Date(event.datetime);
  const end = event.endDatetime
    ? new Date(event.endDatetime)
    : addMinutes(start, 30);
  const params = new URLSearchParams({
    subject: event.name,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description ?? "",
    location: event.location ?? "",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
