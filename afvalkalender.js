const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const months =
  { januari: 0
  , februari: 1
  , maart: 2
  , april: 3
  , mei: 4
  , juni: 5
  , juli: 6
  , augustus: 7
  , september: 8
  , oktober: 9
  , november: 10
  , december: 11
  };

const args = process.argv.slice(2);
if (args.length != 2) {
  console.log("Please specify zip code and house number.");
  process.exit(1);
}
const zip = args[0];
const houseNumber = args[1];

https.get("https://www.mijnafvalwijzer.nl/nl/" + zip + "/" + houseNumber + "/", res => {
  let data = [];
  res.on("data", chunk => data.push(chunk));
  res.on("end", () => {
    const trashDays = extractTrashDaysFromHtml(data);
    const ical = toICalString(trashDays);
    console.log(ical)
  });
});

function extractTrashDaysFromHtml(data) {
  const document = new JSDOM(data).window.document;
  const trashDaysElement = document.querySelector(".ophaaldagen");
  const year = +trashDaysElement.getAttribute("id").slice(5);
  const trashDayElements = trashDaysElement.querySelectorAll("p");
  const trashDays = [].slice.apply(trashDayElements).map(trashDayElement => parseTrashDay(trashDayElement, year));
  return trashDays;
}

function parseTrashDay(trashDayElement, year) {
  const dayString = trashDayElement.children[0].textContent;
  const day = +dayString.split(" ")[1];
  const month = months[dayString.split(" ")[2]];
  const descString = trashDayElement.children[1].textContent;
  return { day: new Date(year, month, day), type: trashDayElement.className, description: descString };
}

function toICalString(trashDays) {
  const ical = [];
  ical.push("BEGIN:VCALENDAR");
  ical.push("VERSION:2.0");
  ical.push("PRODID:-//Erik Hesselink//Afvalkalender//EN");
  ical.push("X-WR-CALNAME:Afvalkalender");
  ical.push("X-WR-CALDESC:Afvalkalender voor " + zip + " nummer " + houseNumber);
  const now = new Date();

  trashDays.forEach(trashDay => {
    const day = trashDay.day;
    ical.push("BEGIN:VEVENT");
    ical.push("UID:" + day.toISOString() + "-" + trashDay.type);
    ical.push("DTSTART;VALUE=DATE:" + day.getFullYear() + padZero(day.getMonth() + 1) + padZero(day.getDate()));
    ical.push("DTSTAMP:" + now.getFullYear() + padZero(now.getMonth() + 1) + padZero(now.getDate())
             + "T" + padZero(now.getHours()) + padZero(now.getMinutes()) + padZero(now.getSeconds()) + "Z")
    ical.push("SUMMARY:" + trashDay.description);
    ical.push("BEGIN:VALARM");
    ical.push("TRIGGER:-PT5H");
    ical.push("ACTION:DISPLAY");
    ical.push("DESCRIPTION:" + trashDay.description);
    ical.push("END:VALARM");
    ical.push("END:VEVENT");
  });

  ical.push("END:VCALENDAR");
  return ical.join("\n");
}

function padZero(n) {
  if (n < 10) {
    return "0" + n;
  }
  return "" + n
}
