import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptPassword = promisify(scrypt);

export class Password {
  static async toHash(password: string) {
    const salt = randomBytes(8).toString("hex");
    const buff = (await scryptPassword(password, salt, 64)) as Buffer;
    return `${buff.toString("hex")}.${salt}`;
  }

  static async compare(storedPassword: string, userPassword: string) {
    const [hashedPassword, salt] = storedPassword.split(".");
    const buff = (await scryptPassword(userPassword, salt, 64)) as Buffer;

    return buff.toString("hex") === hashedPassword;
  }
}
