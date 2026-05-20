import { Router } from "express";
import { REGIONS, PORTS, VESSEL_SIZES } from "../lib/knowledge-base";

const router = Router();

router.get("/knowledge/regions", (_req, res) => {
  res.json(REGIONS);
});

router.get("/knowledge/ports", (_req, res) => {
  res.json(PORTS);
});

router.get("/knowledge/vessel-sizes", (_req, res) => {
  res.json(VESSEL_SIZES);
});

export default router;
