import { Router } from "express";
import passport from "passport";
import { authController } from "../controllers/authController";
import { env } from "../config/env";
import { prisma } from "../config/db";

const router = Router();

router.get("/me", authController.getMe);
router.post("/login", authController.devLogin);
router.post("/logout", authController.logout);

// Google OAuth start
router.get("/google", (req, res, next) => {
  if (env.google.clientId && env.google.clientSecret) {
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
  } else {
    // Graceful dev fallback if Google OAuth credentials haven't been configured yet
    console.log("[Dev Mode] Google OAuth credentials not set. Creating standard demo user session.");
    authController.devLogin(req, res).then(() => {
      res.redirect(`${env.frontendUrl}/scheduled`);
    });
  }
});

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Successful authentication, redirect to frontend dashboard
    res.redirect(`${env.frontendUrl}/scheduled`);
  }
);

export default router;
