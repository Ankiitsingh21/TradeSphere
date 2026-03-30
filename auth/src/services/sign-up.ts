import { BadRequestError } from "@showsphere/common";
import { User } from "../models/user";
import jwt from "jsonwebtoken";

class UserService {
  async signup(email: string, password: string) {
    const existinguser = await User.findOne({
      email: email,
    });

    if (existinguser) {
      throw new BadRequestError("User already exits");
    }

    const user = User.build({ email, password });
    await user.save();

    const userJwt = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_KEY!,
    );

    return { user, userJwt };
  }
}

export default UserService;
