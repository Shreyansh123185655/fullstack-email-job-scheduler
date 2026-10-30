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
router.get("/google", async (req, res, next) => {
  if (env.google.clientId && env.google.clientSecret) {
    return passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
  }

  // Graceful fallback for local development without live Google OAuth keys
  console.log("[Dev Mode] Google OAuth credentials not set. Creating standard demo user session.");
  try {
    let user = await prisma.user.findUnique({ where: { email: "oliver.brown@reachinbox.ai" } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "oliver.brown@reachinbox.ai",
          name: "Oliver Brown",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        },
      });
    }

    (req.session as any).userId = user.id;

    if (req.login) {
      req.login(user, (err) => {
        if (err) {
          console.error("[Login Session Error]", err);
          return res.redirect(`${env.frontendUrl}/login?error=session_error`);
        }
        return req.session.save(() => {
          return res.redirect(`${env.frontendUrl}/scheduled`);
        });
      });
    } else {
      return req.session.save(() => {
        return res.redirect(`${env.frontendUrl}/scheduled`);
      });
    }
  } catch (err: any) {
    console.error("[Auth Error]", err);
    return res.redirect(`${env.frontendUrl}/login?error=auth_error`);
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
    req.session.save(() => {
      res.redirect(`${env.frontendUrl}/scheduled`);
    });
  }
);

export default router;
