import { differenceInDays, parseISO } from 'date-fns';

const today = new Date();
const dateStr = '2026-06-11';
const diff = differenceInDays(today, parseISO(dateStr));

console.log("Today:", today);
console.log("Parsed:", parseISO(dateStr));
console.log("Diff:", diff);
