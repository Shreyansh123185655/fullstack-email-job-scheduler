import { Router } from "express";
import { senderController } from "../controllers/senderController";

const router = Router();

router.get("/", senderController.list);
router.post("/", senderController.create);
router.post("/ethereal", senderController.createEthereal);

export default router;
