import mongoose from "mongoose";
import Restaurant from "./dist/models/Restaurant.js";
import dotenv from "dotenv";

import fs from "fs";

const data = JSON.parse(
  fs.readFileSync(new URL("./restaurants_seed.json", import.meta.url)),
);

dotenv.config();

const MONGO_URI = `${process.env.MONGO_URI}Zomato_Clone`;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    await Restaurant.insertMany(data);

    console.log("Seeded 100 restaurants ✓");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
