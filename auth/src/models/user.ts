import mongoose from "mongoose";
import { Password } from "../middlewares/password";

interface userAttrs {
  email: string;
  password: string;
}
interface userDoc extends mongoose.Document {
  id: string;
  email: string;
  password: string;
}

interface userModal extends mongoose.Model<userDoc> {
  build(attrs: userAttrs): userDoc;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const hash = await Password.toHash(this.get("password"));
    this.set("password", hash);
  }
});

userSchema.statics.build = (attrs: userAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<userDoc, userModal>("User", userSchema);

export { User };
