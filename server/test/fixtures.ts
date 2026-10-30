/** Small fixed dataset in the raw NY Open Data format. */
export const RAW_ROWS = [
  { draw_date: "2015-10-03T00:00:00.000", winning_numbers: "01 02 03 04 05 06" }, // before rule change
  { draw_date: "2015-10-07T00:00:00.000", winning_numbers: "18 30 40 48 52 09" },
  { draw_date: "2015-10-10T00:00:00.000", winning_numbers: "12 27 29 43 68 01" },
  { draw_date: "2015-10-14T00:00:00.000", winning_numbers: "15 20 29 31 40 01" },
  { draw_date: "2015-10-17T00:00:00.000", winning_numbers: "05 12 23 34 45 06" },
  { draw_date: "2015-10-21T00:00:00.000", winning_numbers: "69 01 02 03 04 26" }, // unsorted whites
];

/** Same draws after parsing (whites sorted, date trimmed). */
export const PARSED = [
  { date: "2015-10-07", whites: [18, 30, 40, 48, 52], powerball: 9 },
  { date: "2015-10-10", whites: [12, 27, 29, 43, 68], powerball: 1 },
  { date: "2015-10-14", whites: [15, 20, 29, 31, 40], powerball: 1 },
  { date: "2015-10-17", whites: [5, 12, 23, 34, 45], powerball: 6 },
  { date: "2015-10-21", whites: [1, 2, 3, 4, 69], powerball: 26 },
];

export const BAD_ROWS = [
  null,
  "not an object",
  { winning_numbers: "01 02 03 04 05 06" },
  { draw_date: "2016-01-01T00:00:00.000" },
  { draw_date: "2016-02-30T00:00:00.000", winning_numbers: "01 02 03 04 05 06" }, // impossible date
  { draw_date: "2016-01-02T00:00:00.000", winning_numbers: "01 02 03 04 05" }, // too few
  { draw_date: "2016-01-03T00:00:00.000", winning_numbers: "01 02 03 04 05 06 07" }, // too many
  { draw_date: "2016-01-04T00:00:00.000", winning_numbers: "01 02 03 04 70 06" }, // white out of range
  { draw_date: "2016-01-05T00:00:00.000", winning_numbers: "00 02 03 04 05 06" }, // white zero
  { draw_date: "2016-01-06T00:00:00.000", winning_numbers: "01 01 03 04 05 06" }, // duplicate white
  { draw_date: "2016-01-07T00:00:00.000", winning_numbers: "01 02 03 04 05 27" }, // pb out of range
  { draw_date: "2016-01-08T00:00:00.000", winning_numbers: "01 02 03 04 05 x" }, // non-numeric
  { draw_date: "2015-10-07T00:00:00.000", winning_numbers: "01 02 03 04 05 06" }, // duplicate date
];
