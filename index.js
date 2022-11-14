import express, { application } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import cors from 'cors';
import dayjs from 'dayjs';

dotenv.config();  

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("db_uol");
});

const app = express();
app.use(express.json());
app.use(cors());

const participantSchema = joi.object({
    name: joi.string().required()
})

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().pattern(/message/, /private_message/),
    from: joi.string().required()
})

app.get('/participants', async (req, res) => {
    try {
      const participants = await db.collection('participants').find().toArray();
      res.send(participants);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  }); 

  app.post('/participants', async (req, res) => {
    const participant = req.body;
    const message = {from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')};

    const validation = participantSchema.validate(participant, { abortEarly: true});

    if(validation.error){
        console.log(validation.error.details);
        res.sendStatus(422);
        return;
    }
    
    try{
        const participants = await db.collection('participants').find().toArray();
        const nameExists = participants.some(p => p.name === participant.name);

        if(nameExists === false){
        const { name } = participant;

        await db.collection('participants').insertOne({ name, 'lastStatus': Date.now() });
        await db.collection('messages').insertOne(message);

        res.sendStatus(201);
        }else{
            res.status(409).send("Já existe um participante com este nome!");
        }
    }catch(error){
        console.error(error);
        res.sendStatus(500);
    }

}); 

app.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers.user;
	
    try{
        if(limit){
            const messages = await db.collection('messages').find({ $or: [  {to: "Todos"}, {to: user}, {from: user}, {type: "message"} ] }).sort({_id: -1}).limit(limit).toArray();
            res.send(messages.reverse());
        }else{
            const messages = await db.collection('messages').find({ $or: [  {to: "Todos"}, {to: user}, {from: user} ] }).toArray();
            res.send(messages.reverse());
        }

    }catch(error){
        console.error(error);
        res.sendStatus(500);
    }
});





app.listen(5000, () => {
    console.log('Server is litening on port 5000.');
  });