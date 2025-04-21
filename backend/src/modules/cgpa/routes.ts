import { Router } from "express";
import { Controller } from "./controller";
import upload from "../../utils/multer";

const router = Router();
const controller = new Controller();

router.post("/upload", upload.single("file"), controller.upload);
router.get("/download/:filename", controller.download);

export default router;
