import express,{Request,Response} from 'express'
import api from './routes/index';
import { connectDB } from './config/db';
import { BadRequestError, errorHandler } from '@showsphere/common';





const app = express();
app.use(express.json());



app.use('/api',api);



app.use(errorHandler);


const start = async () => {
  process.env.MONGO_URI="mongodb://localhost:27017/auth";

  await connectDB();

  app.listen(3000, () => {
    console.log(`Listening on ${3000}`);
  });
};

start();

