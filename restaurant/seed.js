import mongoose from "mongoose";
import Restaurant from "./dist/models/Restaurant.js";
import MenuItems from "./dist/models/MenuItems.js";
import dotenv from "dotenv";

import fs from "fs";

const restaurants_data = JSON.parse(
  fs.readFileSync(new URL("./restaurants_seed.json", import.meta.url)),
);

const menuitems_data = JSON.parse(
  fs.readFileSync(new URL("./menuitems_seed.json", import.meta.url)),
);

dotenv.config();

const MONGO_URI = `${process.env.MONGO_URI}Zomato_Clone`;

async function seed_restaurants() {
  try {
    await mongoose.connect(MONGO_URI);

    await Restaurant.insertMany(restaurants_data);

    console.log("Seeded 100 restaurants ✓");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function seed_menuitems() {
  try {
    await mongoose.connect(MONGO_URI);

    await MenuItems.insertMany(menuitems_data);

    console.log("Seeded menuitems ✓");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed_menuitems();
