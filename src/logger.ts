import winston from "winston";

export const logger = winston.createLogger({
   level: "info",
   format: winston.format.combine(
      winston.format.timestamp({
         format: "YYYY-MM-DD hh:mm:ss A",
      }),
      winston.format.align(),
      winston.format.printf(
         (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
      )
   ),
   transports: [
      new winston.transports.Console(),
      new winston.transports.File({
         filename: "log.txt",
         tailable: false,
      }),
   ],
});
