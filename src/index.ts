import puppeteer, { Page } from "puppeteer";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

import { logger } from "./logger";
import { formatDate, parseDate, sleep } from "./util";

const EMBASSY_CODE = process.env.EMBASSY_CODE;
const SCHEDULE_ID = process.env.SCHEDULE_ID;
const EMBASSY_ID = process.env.EMBASSY_ID;

const STEP_TIME = 100;

const LOGIN_PAGE = `https://ais.usvisa-info.com/${EMBASSY_CODE}/niv/users/sign_in`;
const DATE_URL = `https://ais.usvisa-info.com/${EMBASSY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/days/${EMBASSY_ID}.json?appointments[expedite]=false`;
// const TIME_URL = `https://ais.usvisa-info.com/${EMBASSY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${FACILITY_ID}.json?date=%s&appointments[expedite]=false`;
// const SIGN_OUT_LINK = `https://ais.usvisa-info.com/${EMBASSY_CODE}/niv/users/sign_out`;

const Login = async (page: Page) => {
   logger.info("Trying to login");

   await page.goto(LOGIN_PAGE);

   await page.waitForSelector('[name="commit"]', { timeout: 60000 });

   // Type email
   await page.type(`[name="user[email]"]`, process.env.USERNAME!, {
      delay: STEP_TIME,
   });
   await sleep(STEP_TIME);

   // Type password
   await page.type(`[name="user[password]"]`, process.env.PASSWORD!, {
      delay: STEP_TIME,
   });
   await sleep(STEP_TIME);

   await page.click(`[name="policy_confirmed"]`);
   await sleep(STEP_TIME);

   await page.click('[name="commit"]');

   await page.waitForSelector(
      `[href="/fr-fr/niv/schedule/${SCHEDULE_ID}/continue_actions"]`,
      { timeout: 60000 }
   );

   logger.info("login successful!");
   SendNotifcation("Logged in successfully");
};

const GetYatriSessionToken = async (page: Page) => {
   const cookies = await page.cookies();

   const yatriSessionCookie = cookies.filter((c) => c.name == "_yatri_session");

   if (!yatriSessionCookie.length) {
      throw "Yatri session cookie not found";
   }

   return yatriSessionCookie[0].value;
};

const MakeRequest = async (page: Page, url: string) => {
   const sessionToken = await GetYatriSessionToken(page);

   return await page.evaluate(
      (url: string, session: string) => {
         var req = new XMLHttpRequest();
         req.open("GET", url, false);
         req.setRequestHeader(
            "Accept",
            "application/json, text/javascript, */*; q=0.01"
         );
         req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
         req.setRequestHeader("Cookie", `_yatri_session=${session}`);
         req.send();
         return req.responseText;
      },
      url,
      sessionToken
   );
};

const GetEarliestDate = async (page: Page) => {
   const datesRaw = await MakeRequest(page, DATE_URL);

   const dates = JSON.parse(datesRaw) as { date: string }[];

   return parseDate(dates[0].date);
};

const IsDateBetter = (date: Date) => {
   const max = parseDate(process.env.PREFERRED_DATES_LIMIT!);

   return max > date;
};

const SendNotifcation = (msg: string) => {
   logger.info("Sending notification: " + msg);

   const url = "https://api.pushover.net/1/messages.json";
   const data = {
      token: process.env.PUSHOVER_TOKEN,
      user: process.env.PUSHOVER_USER,
      message: msg,
   };
   return axios.post(url, data);
};

const Loop = async (page: Page) => {
   const earliestDate = await GetEarliestDate(page);

   logger.info(`The earliest date found: ${formatDate(earliestDate)}`);

   const isBetter = IsDateBetter(earliestDate);

   if (isBetter) {
      SendNotifcation(`Found an early date: ${formatDate(earliestDate)}`);
   }
};

const Main = async () => {
   const browser = await puppeteer.launch();
   const page = await browser.newPage();

   let count = 0;

   while (true) {
      logger.info(`Retry #${++count}`);

      try {
         await Loop(page);

         const sleepMinutes = 5 * Math.random() + 5;
         logger.info(`Sleeping for ${sleepMinutes.toFixed(2)}min`);
         await sleep(sleepMinutes * 60 * 1000); // Sleep
      } catch (e) {
         logger.error(e);
         SendNotifcation(`Error: ${e}`);

         await Login(page);
      }
   }
};

Main();
