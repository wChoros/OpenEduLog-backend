-- First, add the date column
ALTER TABLE "Timetable"
ADD "date" TIMESTAMP(3);

-- Create a function to convert WeekDays enum to day number
CREATE OR REPLACE FUNCTION weekday_to_number(day "WeekDays") RETURNS integer AS $$
BEGIN
    RETURN CASE day
        WHEN 'MONDAY'::WeekDays THEN 1
        WHEN 'TUESDAY'::WeekDays THEN 2
        WHEN 'WEDNESDAY'::WeekDays THEN 3
        WHEN 'THURSDAY'::WeekDays THEN 4
        WHEN 'FRIDAY'::WeekDays THEN 5
        WHEN 'SATURDAY'::WeekDays THEN 6
        WHEN 'SUNDAY'::WeekDays THEN 7
        ELSE 1 -- Default to Monday if something goes wrong
    END;
END;
$$ LANGUAGE plpgsql;

-- Then, update the date column based on weekNumber and weekDay
UPDATE "Timetable"
SET "date" = '2024-01-01'::date +
 (("weekNumber" - 1) * 7 + (weekday_to_number("weekDay") - 1)) * INTERVAL '1 day';

-- Set the date column to NOT NULL and drop original columns
ALTER TABLE "Timetable"
ALTER "date" SET NOT NULL,
DROP "weekDay",
DROP "weekNumber";

-- Optional: Remove the function if you don't need it later
-- DROP FUNCTION weekday_to_number;