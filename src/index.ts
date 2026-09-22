import { createCMU } from "./cmu.js";
import fs from "fs/promises";

const res = await createCMU("D:\\Downloads\\gklerp.png", false);
await fs.writeFile("data.py", res);