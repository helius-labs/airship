import workerpool from "workerpool";
import { pollingService } from "../services/pollingService";

// create a worker and register public functions
workerpool.worker({
  start: pollingService,
});
