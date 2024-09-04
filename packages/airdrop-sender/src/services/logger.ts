import { createLogger, transports, format } from "winston";
import { isNode } from "../utils/common";

const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS",
    }),
    format.align(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
});

if (typeof process !== "undefined" && isNode(process)) {
  logger.add(new transports.File({ filename: "airdrop.log" }));
}

export { logger };
