import { registerModel, Schema } from '../db';

var ScheduledTask = new Schema({
  name: String, // nazev planovaneho ukolu
  worker: String, // identifikator workera, ktery uzamkl ukol
  lockedUntil: Date, // cas do ktereho je probihajici pracovani pro dalsiho workera uzamceno
  nextAt: Date, // cas naplanovaneho dalsiho zpracovani
  startedAt: Date, // cas zapoceti zpracovani ukolu, null ukol neni aktualne zpracovavan
  finishedAt: Date // cas posledniho dokonceni zpracovani ukolu
});

ScheduledTask.index(
  {
    name: 1,
    lockedUntil: 1
  },
  { unique: false }
);

ScheduledTask.index(
  {
    name: 1,
    worker: 1
  },
  { unique: false }
);

ScheduledTask.index(
  {
    name: 1
  },
  { unique: true }
);

export default registerModel('ScheduledTask', ScheduledTask);
