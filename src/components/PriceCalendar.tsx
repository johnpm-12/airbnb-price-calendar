"use client";

import { useState, useCallback, useEffect } from "react";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { Event } from "react-big-calendar";

const localizer = dayjsLocalizer(dayjs);

export default function PriceCalendar({
  events,
  defaultDate,
}: {
  events: Event[];
  defaultDate: string;
}) {
  const [date, setDate] = useState<Date>(new Date(defaultDate));

  const onNavigate = useCallback((date: Date) => {
    setDate(date);
  }, []);

  useEffect(() => {
    setDate(new Date(defaultDate));
  }, [defaultDate]);

  return (
    <Calendar
      localizer={localizer}
      events={events}
      views={["month"]}
      date={date}
      onNavigate={onNavigate}
      style={{ height: 700, width: "100%" }}
    />
  );
}
