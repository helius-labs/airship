import workerpool from "workerpool";
import { sendingService } from "../services/sendingService";

// create a worker and register public functions
workerpool.worker({
  start: sendingService,
});
