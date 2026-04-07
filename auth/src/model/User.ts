import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phonenumber: string;
  image: string | null;
  role: string;
}

const schema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      default: null,
    },
    phonenumber: {
      type: String,
      unique: true,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", schema);
export default User;
