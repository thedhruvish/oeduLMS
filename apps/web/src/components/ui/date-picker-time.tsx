import * as React from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";

import { Button } from "@oedulms/ui/components/button";
import { Calendar } from "@oedulms/ui/components/calendar";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@oedulms/ui/components/popover";
import { cn } from "@oedulms/ui/lib/utils";

interface DatePickerTimeProps {
  value: string | Date | null | undefined;
  onChange: (value: string | null) => void;
  dateLabel?: string;
  timeLabel?: string;
  idPrefix?: string;
}

export function DatePickerTime({
  value,
  onChange,
  dateLabel = "Date",
  timeLabel = "Time",
  idPrefix = "datetime",
}: DatePickerTimeProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(null);
      return;
    }
    const newDate = new Date(date);
    if (value) {
      const oldDate = new Date(value);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
    } else {
      newDate.setHours(10, 30, 0); // default to 10:30 AM
    }
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (timeString: string) => {
    if (!timeString) return;
    const parts = timeString.split(":").map(Number);
    const hours = parts[0] ?? 10;
    const minutes = parts[1] ?? 30;
    const seconds = parts[2] ?? 0;
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setHours(hours, minutes, seconds);
    onChange(baseDate.toISOString());
  };

  const timeValue = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(
        selectedDate.getMinutes()
      ).padStart(2, "0")}:${String(selectedDate.getSeconds()).padStart(2, "0")}`
    : "10:30:00";

  return (
    <FieldGroup className="flex-row gap-4">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-date`}>{dateLabel}</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id={`${idPrefix}-date`}
                className={cn(
                  "w-44 justify-between font-normal h-8 text-xs cursor-pointer",
                  !selectedDate && "text-muted-foreground"
                )}
              />
            }
          >
            {selectedDate ? format(selectedDate, "PPP") : "Select date"}
            <ChevronDown data-icon="inline-end" className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              captionLayout="dropdown"
              defaultMonth={selectedDate}
              onSelect={(date) => {
                handleDateSelect(date);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </Field>

      <Field className="w-32">
        <FieldLabel htmlFor={`${idPrefix}-time`}>{timeLabel}</FieldLabel>
        <Input
          type="time"
          id={`${idPrefix}-time`}
          step="1"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </Field>
    </FieldGroup>
  );
}
