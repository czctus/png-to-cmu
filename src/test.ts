import { createCMU } from "./index.js";
import fs from "fs/promises";

const res = await createCMU("example.jpeg", {
    sandbox: false
});
await fs.writeFile("data.py", res);