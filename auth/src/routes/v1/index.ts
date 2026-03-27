import express,{Request,Response} from 'express';
import { signUp } from '../../controller/user-controller';
import { body } from 'express-validator';
import { validateRequest } from '@showsphere/common';

const router = express.Router();

router.post(
        '/sign-up',
        [
          body("email").isEmail().withMessage("Email must be valid"),
          body("password")
            .trim()
            .isLength({ min: 4, max: 20 })
            .withMessage("Password must be between 4 and 20"),
        ],validateRequest,
        signUp
)



export default  router;

