import { Router } from "express";
import passport from "passport";
import { authController } from "../controllers/authController";
import { env } from "../config/env";

const router = Router();

router.get("/me", authController.getMe);
router.post("/login", authController.devLogin);
router.post("/logout", authController.logout);
router.post("/google/verify", authController.verifyGoogleToken);

// Real Google OAuth initiate
router.get("/google", (req, res, next) => {
  if (env.google.clientId && env.google.clientSecret) {
    return passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })(req, res, next);
  }
  return res.redirect(
    `${env.frontendUrl}/login?error=${encodeURIComponent(
      "Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not set. Please configure them in Google Cloud Console."
    )}`
  );
});

// Real Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/login?error=Google%20Authentication%20failed`,
  }),
  (req, res) => {
    const user = req.user as any;
    req.session.save(() => {
      const userData = user
        ? encodeURIComponent(
            JSON.stringify({
              id: user.id,
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
            })
          )
        : "";
      res.redirect(`${env.frontendUrl}/dashboard?user=${userData}`);
    });
  }
);

export default router;
