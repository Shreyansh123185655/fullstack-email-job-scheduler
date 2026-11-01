import { Router } from "express";
import { emailController } from "../controllers/emailController";
const router = Router();
router.get("/counts", emailController.counts);
router.get("/:id", emailController.getById);
router.get("/", emailController.list);
router.post("/schedule", emailController.schedule);
export default router;
