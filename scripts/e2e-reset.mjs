// Repart d'une base de test vierge avant les tests de bout en bout.
import { rmSync } from "node:fs";

rmSync(".data/e2e", { recursive: true, force: true });
rmSync(".data/uploads", { recursive: true, force: true });
