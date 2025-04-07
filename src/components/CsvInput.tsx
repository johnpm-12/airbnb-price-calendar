"use client";

import { useState } from "react";
import { parse } from "papaparse";
import { type } from "arktype";
import BigNumber from "bignumber.js";
import dayjs from "dayjs";
import PriceCalendar from "@/components/PriceCalendar";
import type { Event } from "react-big-calendar";

const CsvData = type(
  {
    Date: "string.date.parse",
    "Arriving by date": "string.date.parse | undefined",
    Type: "'Payout' | 'Reservation' | 'Resolution Payout'",
    "Confirmation code": "string | undefined",
    "Booking date": "string.date.parse | undefined",
    "Start date": "string.date.parse | undefined",
    "End date": "string.date.parse | undefined",
    Nights: "string.integer.parse | undefined",
    Guest: "string | undefined",
    Listing: "string | undefined",
    Details: "string | undefined",
    "Reference code": "undefined",
    Currency: "'USD'",
    Amount: "string.numeric.parse | undefined",
    "Paid out": "string.numeric.parse | undefined",
    "Service fee": "string.numeric.parse | undefined",
    "Fast pay fee": "undefined",
    "Cleaning fee": "string.numeric.parse | undefined",
    "Pet fee": "string.numeric.parse | undefined",
    "Gross earnings": "string.numeric.parse | undefined",
    "Occupancy taxes": "string.numeric.parse | undefined",
    "Earnings year": "string.integer.parse | undefined",
  },
  "[]"
);

type CsvRowReservationType = Omit<
  (typeof CsvData.infer)[0],
  | "Start date"
  | "End date"
  | "Type"
  | "Gross earnings"
  | "Nights"
  | "Booking date"
> & {
  "Start date": Date;
  "End date": Date;
  Type: "Reservation";
  "Gross earnings": number;
  Nights: number;
  "Booking date": Date;
  "Confirmation code": string;
};

export default function CsvInput() {
  const [events, setEvents] = useState<Event[]>([]);
  const [defaultDate, setDefaultDate] = useState(new Date().toDateString());
  return (
    <>
      <p className="m-2">
        Download an earnings report from Airbnb, then upload it here. The
        calendar will fill in with your past reservations showing average
        nightly price (minus fees), and number of days booked in advance. This
        can help with choosing future prices. In Airbnb, go to Earnings, then
        View All Paid, then Get CSV Report to download the csv file.
      </p>
      <input
        className="file:mr-4 file:mb-3 file:border-[1px] file:border-[#ccc] file:rounded-[4px] file:px-[16px] file:py-[4px] file:text-[#373a3c] hover:file:bg-[#e6e6e6] focus:file:bg-[#e6e6e6] active:file:bg-[#d4d4d4] hover:file:border-[#adadad] focus:file:border-[#adadad] active:file:border-[#adadad] file:cursor-pointer cursor-pointer"
        type="file"
        accept=".csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            parse(file, {
              header: true,
              skipEmptyLines: true,
              transform: (value) => (value === "" ? undefined : value),
              complete: (results) => {
                const out = CsvData(results.data);
                if (out instanceof type.errors) {
                  console.error(out.summary);
                  alert(
                    "Invalid CSV format. Please check the file and try again."
                  );
                } else {
                  const reservations = out.filter(
                    (row): row is CsvRowReservationType =>
                      row.Type === "Reservation"
                  );
                  const reservationsCombinedByConfirmationCode: {
                    [code: string]: CsvRowReservationType;
                  } = {};
                  for (const reservation of reservations) {
                    if (
                      typeof reservation["Start date"] === "undefined" ||
                      typeof reservation["End date"] === "undefined" ||
                      typeof reservation["Gross earnings"] === "undefined" ||
                      typeof reservation.Nights === "undefined" ||
                      typeof reservation["Booking date"] === "undefined" ||
                      typeof reservation["Confirmation code"] === "undefined"
                    ) {
                      alert(
                        "Error parsing CSV. Please check the file and try again."
                      );
                    }
                    const code = reservation["Confirmation code"];
                    if (!reservationsCombinedByConfirmationCode[code]) {
                      reservationsCombinedByConfirmationCode[code] =
                        reservation;
                    } else {
                      if (
                        reservationsCombinedByConfirmationCode[code][
                          "Confirmation code"
                        ] !== reservation["Confirmation code"] ||
                        reservationsCombinedByConfirmationCode[code][
                          "Booking date"
                        ].getTime() !== reservation["Booking date"].getTime() ||
                        reservationsCombinedByConfirmationCode[code][
                          "Start date"
                        ].getTime() !== reservation["Start date"].getTime() ||
                        reservationsCombinedByConfirmationCode[code][
                          "End date"
                        ].getTime() !== reservation["End date"].getTime() ||
                        reservationsCombinedByConfirmationCode[code].Nights !==
                          reservation.Nights ||
                        reservationsCombinedByConfirmationCode[code].Guest !==
                          reservation.Guest ||
                        reservationsCombinedByConfirmationCode[code].Listing !==
                          reservation.Listing ||
                        reservationsCombinedByConfirmationCode[code][
                          "Earnings year"
                        ] !== reservation["Earnings year"]
                      ) {
                        console.log(
                          reservationsCombinedByConfirmationCode[code]
                        );
                        console.log(reservation);
                        alert(
                          "Error parsing CSV. Please check the file and try again."
                        );
                        return;
                      }
                      reservationsCombinedByConfirmationCode[code][
                        "Gross earnings"
                      ] = new BigNumber(
                        reservationsCombinedByConfirmationCode[code][
                          "Gross earnings"
                        ]
                      )
                        .plus(reservation["Gross earnings"])
                        .toNumber();
                      reservationsCombinedByConfirmationCode[code][
                        "Cleaning fee"
                      ] = new BigNumber(
                        reservationsCombinedByConfirmationCode[code][
                          "Cleaning fee"
                        ] ?? 0
                      )
                        .plus(reservation["Cleaning fee"] ?? 0)
                        .toNumber();
                      reservationsCombinedByConfirmationCode[code]["Pet fee"] =
                        new BigNumber(
                          reservationsCombinedByConfirmationCode[code][
                            "Pet fee"
                          ] ?? 0
                        )
                          .plus(reservation["Pet fee"] ?? 0)
                          .toNumber();
                    }
                  }
                  const parsedEvents = Object.values(
                    reservationsCombinedByConfirmationCode
                  ).map((row) => ({
                    title: `${new BigNumber(row["Gross earnings"])
                      .minus(row["Cleaning fee"] ?? 0)
                      .minus(row["Pet fee"] ?? 0)
                      .div(row.Nights)
                      .toNumber()
                      .toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                        style: "currency",
                        currency: "USD",
                      })} - ${dayjs(row["Start date"]).diff(
                      row["Booking date"],
                      "day"
                    )} days prior`,
                    start: row["Start date"],
                    end: row["End date"],
                    allDay: true,
                  }));
                  setEvents(parsedEvents);
                  if (parsedEvents.length > 0) {
                    setDefaultDate(parsedEvents[0].start.toDateString());
                  }
                }
              },
              error: (error) => {
                console.error("Error parsing CSV:", error);
                alert(
                  "Error parsing CSV. Please check the file and try again."
                );
              },
            });
          }
        }}
      />
      <PriceCalendar events={events} defaultDate={defaultDate} />
    </>
  );
}
