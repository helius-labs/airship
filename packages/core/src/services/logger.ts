import { createLogger, transports, format } from "winston";
import { isNode } from "../utils/common";
import { Console } from "../utils/console";

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
  logger.add(new transports.File({ filename: "airship.log" }));
} else {
  logger.add(new Console({
    silent: false,
    level: 'info',
  }));
}

export { logger };
