import express from "express";
import passport from "passport";
import * as authController from "./../controllers/authController.js";
import * as userController from "./../controllers/userController.js";

const router = express.Router();

// router.get("/isLoggedIn", authController.isLoggedIn);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
  (req, res, next) => {
    // Google OAuth authentication successful, call createSendToken function
    authController.createSendToken(req.user, 200, req, res, next);
  }
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Successful authentication, redirect or respond with a success message
    console.log(req.user);
    res.redirect("http://localhost:3000");
  }
);

router.post("/signup", authController.signup);
router.post("/login", authController.logIn);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token&:email", authController.resetPassword);

router.patch("/updateMe", authController.protect, userController.updateMe);
router.get(
  "/me",
  authController.protect,
  userController.getMe,
  userController.getUserById
);

router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

// router.use(authController.protect, authController.restrictTo("admin"));
router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUserById)
  .patch(userController.updateUserById)
  .delete(userController.deleteUserById);

export default router;
