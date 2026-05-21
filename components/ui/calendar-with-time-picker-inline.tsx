"use client";

import { CalendarIcon, Clock } from "lucide-react";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function dateFromKey(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function dateToKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateLabel(value?: string) {
  const date = dateFromKey(value);
  if (!date) return "Pick date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Component = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-lg p-4")}>
      <h1 className="mb-2 text-2xl font-bold">Component Example</h1>
      <h2 className="text-xl font-semibold">{count}</h2>
      <div className="flex gap-2">
        <button onClick={() => setCount((prev) => prev - 1)}>-</button>
        <button onClick={() => setCount((prev) => prev + 1)}>+</button>
      </div>
    </div>
  );
};

export function Calendar17() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2025, 5, 12));

  return (
    <Card className="w-fit py-4">
      <CardContent className="px-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="bg-transparent p-0 [--cell-size:--spacing(10.5)]"
        />
      </CardContent>
      <CardFooter className="flex gap-2 border-t px-4 !pt-4 *:[div]:w-full">
        <div>
          <Label htmlFor="time-from" className="sr-only">
            Start Time
          </Label>
          <Input
            id="time-from"
            type="time"
            step="1"
            defaultValue="10:30:00"
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
        <span>-</span>
        <div>
          <Label htmlFor="time-to" className="sr-only">
            End Time
          </Label>
          <Input
            id="time-to"
            type="time"
            step="1"
            defaultValue="12:30:00"
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </CardFooter>
    </Card>
  );
}

export function CalendarDateField({
  id,
  value,
  onChange,
  disabled,
  className,
  calendarClassName,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  calendarClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = dateFromKey(value);

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="h-10 w-full justify-start gap-2 bg-background/80 text-left font-normal"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{formatDateLabel(value)}</span>
      </Button>
      {open && !disabled && (
        <div className={cn("rounded-lg border bg-background p-3 shadow-sm", calendarClassName)}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(dateToKey(date));
              setOpen(false);
            }}
            className="bg-transparent p-0"
          />
        </div>
      )}
    </div>
  );
}

export function CalendarWithTimePickerInline({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  disabled,
  className,
}: {
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("w-fit py-4", className)}>
      <CardContent className="px-4">
        <Calendar
          mode="single"
          selected={dateFromKey(date)}
          onSelect={(nextDate) => {
            if (nextDate) onDateChange(dateToKey(nextDate));
          }}
          disabled={disabled}
          className="bg-transparent p-0"
        />
      </CardContent>
      <CardFooter className="flex gap-2 border-t px-4 !pt-4 *:[div]:w-full">
        <div>
          <Label htmlFor="time-from" className="sr-only">
            Start Time
          </Label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="time-from"
              type="time"
              step="60"
              value={startTime}
              disabled={disabled}
              onChange={(event) => onStartTimeChange(event.target.value)}
              className="pl-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
        <span className="self-center text-muted-foreground">-</span>
        <div>
          <Label htmlFor="time-to" className="sr-only">
            End Time
          </Label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="time-to"
              type="time"
              step="60"
              value={endTime}
              disabled={disabled}
              onChange={(event) => onEndTimeChange(event.target.value)}
              className="pl-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
