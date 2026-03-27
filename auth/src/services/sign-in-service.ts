import { BadRequestError } from "@showsphere/common";
import { User } from "../models/user";
import { Password } from "../config/password";
import jwt from "jsonwebtoken";

class SignInService {
  async signIn(email: string, password: string) {
    const existinguser = await User.findOne({ email });
    if (!existinguser) {
      throw new BadRequestError("Not registered");
    }

    const passwordMatch = await Password.compare(
      existinguser.password,
      password,
    );

    if (!passwordMatch) {
      throw new BadRequestError("Password must be correct ");
    }

    const existinguserJwt = jwt.sign(
      {
        id: existinguser.id,
        email: existinguser.email,
      },
      process.env.JWT_KEY!,
    );

    return existinguserJwt;
  }
}

export default SignInService;
