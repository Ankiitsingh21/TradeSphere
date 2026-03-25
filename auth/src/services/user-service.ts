import { BadRequestError } from "@showsphere/common";
import { User } from "../models/user";

class UserService{
        async signup(email:string,password:string){
                try{const existinguser = await User.findOne({
                        email:email
                })

                if(existinguser){
                        throw new BadRequestError('User already exits');
                }

                const user =  User.build({email,password});
                await user.save();

                return user;}
                catch(error){
                        console.log("Something went wrong at service layer");
                        throw error;
                }
        }
}

export default  UserService;