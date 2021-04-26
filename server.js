import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import Pusher from 'pusher'

import mongoData from './mongoData.js'

//app config
const app = express()
const port = process.env.PORT || 8000 

const pusher = new Pusher({
    appId: "1167046",
    key: "fd78944267117628934d",
    secret: "79f688d5afe24e84a5f5",
    cluster: "us3",
    useTLS: true
});

//middlewares
app.use(cors());
app.use(express.json()); //build in json parser

//db config
const mongoURI = 'mongodb+srv://admin:CNWkcnCN6B5ORpXC@cluster0.aknhk.mongodb.net/slackDB?retryWrites=true&w=majority'

mongoose.connect(mongoURI, {
    useCreateIndex: true,
    useNewURlParser: true,
    useUnifiedTopology: true
})

mongoose.connection.once('open', () => {
    console.log('DB Connected')

    const changeStream = mongoose.connection.collection('conversations').watch()

    changeStream.on('change', (change) => {
        if (change.operationType === 'insert') {
            pusher.trigger('channels', 'newChannel', {
                'change' : change
            });
        } else if (change.operationType === 'update') {
            pusher.trigger('conversation', 'newMessage', {
                'change' : change
            })
        } else {
            console.log('Error triggering Pusher')
        }
    })
})

//api routes
app.get('/', (req, res) => res.status(200).send("Hello programmer!"))

app.post('/new/channel', (req, res) => {        // need to store channel name in a variable, dbData.
    const dbData = req.body //whatever we get from req body, we want to save to dbData. 

    mongoData.create(dbData, (err,data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(201).send(data)  //doc created
        }
    })
})

app.post('/new/message', (req, res) => {
    const id = req.query.id  //document id
    const newMessage = req.body   //new message

    mongoData.update(
        { _id: id },    //filters which conversation we want to add the message to
        { $push: {conversation: newMessage} }, //push the new data in the conversation
        (err, data) => {
            if (err) {
                res.status(500).send(err)
            } else {
                res.status(201).send(data)  //doc created
            }
    }
    )
})

app.get('/get/channelList', (req, res) => { //for sidebar to display channellist
    mongoData.find((err,data) => {          //get all data from Mongodb, mongoData
        if (err) {
            res.status(500).send(err)
        } else { 
            let channels = []           //will be sent back to frontend
            console.log(data)
            data.map((channelData) => {   //looping through the data mapping out the data and grabbing id and name from channelData
                const channelInfo = {
                    id: channelData._id,
                    name: channelData.channelName
                }

                channels.push(channelInfo)
            })
            
            res.status(200).send(channels)  //sending array of channels (with id + name in each array-item) to frontend
        }
    })
})

app.get('/get/conversation', (req, res) => {
    const id = req.query.id   //req.query.id to know which convo are we in. Comes from React router that makes request, and the id is passed on to this request

    mongoData.find({_id: id }, (err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})

//listen
app.listen(port, () => console.log(`listening on localhost:${port}`))