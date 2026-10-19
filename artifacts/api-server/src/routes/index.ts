import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gameSyncRouter from "./gameSync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gameSyncRouter);

export default router;
